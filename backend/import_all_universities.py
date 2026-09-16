#!/usr/bin/env python3
"""Importa TODAS as provas de vestibular disponíveis, universidade por
universidade, ano por ano, direto pela API do backend — sem depender do
frontend.

Por que ano por ano: cada importador varre o site oficial e abre PDFs
inteiros na memória. O backend roda em plano free (512 MB) e já morreu de
OOM importando vários anos de uma vez (ver o aviso do importador da UFSC no
painel do owner). Uma chamada por ano mantém o pico de memória baixo, e o
próximo ano só começa depois que o anterior TERMINOU de verdade — este
script espera o `status` da tarefa sair de "running" antes de seguir.

Uso básico:

    python3 import_all_universities.py

As credenciais do owner saem de `owner_keys.txt` (mesma pasta), no formato:

    email=owner@exemplo.com.br
    password=...

Esse arquivo tem senha em texto puro e está no .gitignore — não versione.

O script primeiro pergunta, universidade por universidade, o que deve
importar — e só começa a baixar depois que TODAS as respostas foram dadas e
a seleção foi confirmada. Assim dá pra escolher tudo de uma vez e largar
rodando, em vez de ter que voltar ao terminal a cada universidade que
termina. Use `--yes` pra não perguntar nada (necessário quando roda em
background/sem terminal).

O progresso é salvo em `--state-file`: rodar de novo continua de onde parou,
sem repetir o que já terminou (útil porque a fila inteira leva horas). Erros
vão para `--error-log` em JSON Lines, um objeto por falha, com corpo da
resposta, logs da tarefa e traceback — é o arquivo pra usar depois na
correção.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests

# ── Registro de importadores ─────────────────────────────────────────────────
#
# `endpoint` é o caminho real do backend (conferido em app/routers/*.py — os
# nomes NÃO seguem um padrão único: os importadores mais antigos usam
# "/<nome>-questions/admin/import-all", os mais novos usam "/<nome>/import").
#
# `supports_until` existe pra endpoints que só aceitam `since_year` — hoje
# nenhum está nesse caso: cebraspe/ita/unesp/unifesp passaram a aceitar
# `until_year` (ver app/routers/cebraspe.py, unesp.py, unifesp.py, ita.py e
# app/services/ita/pdf_import.py) porque uma chamada só cobrindo todos os
# anos de uma vez sobrecarregava o backend — sem pausa entre anos dentro do
# mesmo processo em background, no plano free. Fatiado por ano como os
# demais, cada ano espera o anterior terminar antes de começar (via
# polling do task_id, igual ao resto da fila).
#
# `first_year`/`last_year` delimitam o que existe de verdade em cada site,
# pelo que foi confirmado baixando os PDFs. Onde o vestibular próprio foi
# descontinuado (UFRN em 2013, UFPA em 2014) o intervalo termina ali de
# propósito: pedir anos posteriores só gastaria requisição para nada.


@dataclass
class Importer:
    slug: str
    label: str
    endpoint: str
    first_year: int
    last_year: Optional[int] = None  # None = ano corrente + 1
    supports_until: bool = True
    extra_params: dict = field(default_factory=dict)
    note: str = ""
    # "modulo:funcao" da função de importação em lote, usada no modo --local
    # (roda aqui na máquina em vez de chamar a API do servidor).
    local_target: str = ""


_NEXT_YEAR = datetime.now().year + 1

IMPORTERS: list[Importer] = [
    # ── Exames de abrangência nacional/regional ──
    Importer("enem", "ENEM", "/enem-questions/admin/import-all", 2009,
             local_target="app.services.enem.pdf_import:import_all_enem_exams"),
    Importer("acafe", "ACAFE", "/acafe-questions/admin/run-seed", 2015,
             local_target="app.services.acafe.seed:import_all_acafe_exams"),
    Importer("cebraspe", "UnB/CEBRASPE", "/cebraspe/import", 2015, 2024,
             local_target="app.services.cebraspe.pdf_import:seed_cebraspe"),
    # ── Sudeste ──
    Importer("fuvest", "USP/FUVEST", "/fuvest-questions/admin/import-all", 2009,
             local_target="app.services.fuvest.seed:import_all_fuvest_exams"),
    Importer("unicamp", "UNICAMP", "/unicamp-questions/admin/import-all", 2015,
             local_target="app.services.unicamp.pdf_import:import_all_unicamp_exams"),
    Importer("unesp", "UNESP", "/unesp/import", 2015, 2024,
             local_target="app.services.unesp.pdf_import:seed_unesp"),
    Importer("unifesp", "UNIFESP", "/unifesp/import", 2015, 2024,
             local_target="app.services.unifesp.pdf_import:seed_unifesp"),
    Importer("ita", "ITA", "/ita-questions/admin/import-all", 2019,
             local_target="app.services.ita.pdf_import:import_all_ita_exams"),
    Importer("pucrio", "PUC-Rio", "/pucrio-questions/admin/import-all", 1997,
             note="site publica desde 1997; a pasta '2023-2' é a edição de ingresso 2024",
             local_target="app.services.pucrio.seed:import_all_pucrio_exams"),
    Importer("uerj", "UERJ", "/uerj/import", 2012,
             note="2012 tem número de questão em vetor (não extraível) e é pulado honestamente",
             local_target="app.services.uerj.pdf_import:import_all_uerj_exams"),
    Importer("espm", "ESPM", "/espm-questions/admin/import-all", 2015,
             local_target="app.services.espm.pdf_import:import_all_espm_exams"),
    Importer("fgv", "FGV", "/fgv-questions/admin/import-all", 2015,
             local_target="app.services.fgv.pdf_import:import_all_fgv_exams"),
    Importer("ufjf", "UFJF", "/ufjf/import", 2010,
             local_target="app.services.ufjf.pdf_import:import_all_ufjf_exams"),
    Importer("ufu", "UFU", "/ufu/import", 2023,
             note="2015-2022 usam layout antigo sem os rótulos que o scraper procura",
             local_target="app.services.ufu.pdf_import:import_all"),
    Importer("unimontes", "UNIMONTES", "/unimontes/import", 2015,
             local_target="app.services.unimontes.pdf_import:import_all_unimontes_exams"),
    Importer("pucminas", "PUC Minas", "/pucminas/import", 2015,
             local_target="app.services.pucminas.pdf_import:import_all_pucminas_exams"),
    Importer("puccampinas", "PUC-Campinas", "/puccampinas/import", 2015,
             local_target="app.services.puccampinas.pdf_import:import_all_puccampinas_exams"),
    Importer("unaerp", "UNAERP", "/unaerp/import", 2015,
             local_target="app.services.unaerp.pdf_import:import_all_unaerp_exams"),
    # ── Sul ──
    Importer("ufpr", "UFPR", "/ufpr-questions/admin/import-all", 2009,
             local_target="app.services.ufpr.pdf_import:import_all_ufpr_exams"),
    Importer("ufsc", "UFSC", "/ufsc-questions/admin/import-all", 2010,
             note="importador mais pesado: é o que já causou OOM no plano free",
             local_target="app.services.ufsc.pdf_import:import_all_ufsc_exams"),
    Importer("ufrgs", "UFRGS", "/ufrgs-questions/admin/import-all", 2010,
             local_target="app.services.ufrgs.pdf_import:import_all_ufrgs_exams"),
    Importer("ufpel", "UFPel", "/ufpel-questions/admin/import-all", 2015,
             local_target="app.services.ufpel.seed:import_all_ufpel_exams"),
    Importer("pucpr", "PUCPR", "/pucpr-questions/admin/import-all", 2015,
             local_target="app.services.pucpr.pdf_import:import_all_pucpr_exams"),
    Importer("pucrs", "PUCRS", "/pucrs-questions/admin/import-all", 2022, 2023,
             note="site só publica prova+gabarito de Medicina de Verão 2022 e 2023",
             local_target="app.services.pucrs.seed:import_all_pucrs_exams"),
    Importer("udesc", "UDESC", "/udesc-questions/admin/import-all", 2015,
             local_target="app.services.udesc.seed:import_all_udesc_exams"),
    Importer("uel", "UEL", "/uel/import", 2018, 2025,
             note="mapeamento COPS-UEL cobre 2018-2025",
             local_target="app.services.uel.pdf_import:import_all_uel_exams"),
    Importer("uem", "UEM", "/uem/import", 2015,
             local_target="app.services.uem.pdf_import:import_all_uem_exams"),
    Importer("utfpr", "UTFPR", "/utfpr/import", 2023,
             note="API do site só expõe edições a partir de 2023/2",
             local_target="app.services.utfpr.pdf_import:import_all_utfpr_exams"),
    Importer("unioeste", "UNIOESTE", "/unioeste/import", 2021,
             local_target="app.services.unioeste.pdf_import:import_all_unioeste_exams"),
    Importer("unicentro", "UNICENTRO", "/unicentro/import", 2015,
             local_target="app.services.unicentro.pdf_import:import_all_unicentro_exams"),
    Importer("ufsm", "UFSM", "/ufsm/import", 2011, 2013,
             note="só 2011 tem prova+gabarito em texto; 2012/2013 são pulados honestamente",
             local_target="app.services.ufsm.pdf_import:import_all_ufsm_exams"),
    Importer("ulbra", "ULBRA", "/ulbra/import", 2016,
             note="2015 aponta para host antigo inacessível",
             local_target="app.services.ulbra.pdf_import:import_all_ulbra_exams"),
    # ── Centro-Oeste ──
    Importer("ufg", "UFG", "/ufg/import", 2025,
             note="vestibular próprio só voltou a existir nas edições 2025/2 e 2026",
             local_target="app.services.ufg.pdf_import:import_all_ufg_exams"),
    Importer("ufgd", "UFGD", "/ufgd/import", 2015,
             local_target="app.services.ufgd.pdf_import:import_all_ufgd_exams"),
    Importer("ufms", "UFMS", "/ufms/import", 2015,
             local_target="app.services.ufms.pdf_import:import_all_ufms_exams"),
    # ── Nordeste ──
    Importer("ufrn", "UFRN", "/ufrn/import", 2011, 2013,
             note="vestibular próprio descontinuado depois de 2013 (hoje só SiSU)",
             local_target="app.services.ufrn.pdf_import:import_all_ufrn_exams"),
    # ── Norte ──
    Importer("ufam", "UFAM", "/ufam/import", 2015,
             local_target="app.services.ufam.pdf_import:import_all_ufam_exams"),
    Importer("ufpa", "UFPA", "/ufpa/import", 2008, 2013,
             note="vestibular próprio descontinuado depois de 2013 (hoje só ENEM/SiSU)",
             local_target="app.services.ufpa.pdf_import:import_all_ufpa_exams"),
]


# ── Saída ────────────────────────────────────────────────────────────────────

def log(message: str, level: str = "..") -> None:
    """Toda linha sai com horário — a fila roda por horas, e sem isso não dá
    pra saber depois se uma etapa demorou ou se o script ficou parado."""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {level} {message}", flush=True)


def elapsed(since: float) -> str:
    secs = int(time.time() - since)
    return f"{secs}s" if secs < 60 else f"{secs // 60}m{secs % 60:02d}s"


def ask_university(imp: Importer, years: list[Optional[int]], pending: int, total: int) -> str:
    """Pergunta se essa universidade entra na fila. Devolve 'sim', 'nao',
    'todas' (aceita o resto sem perguntar) ou 'sair' (cancela tudo — como
    isso roda antes de qualquer download, cancelar aqui não deixa nada pela
    metade)."""
    if not imp.supports_until:
        span = f"de {years[0]} em diante, numa chamada só (endpoint não aceita until_year)"
    elif len(years) == 1:
        span = f"{years[0]}"
    else:
        span = f"{years[0]}–{years[-1]} ({len(years)} anos)"
    print()
    print(f"  {imp.label} [{imp.slug}] — {span}")
    print(f"    endpoint: /api{imp.endpoint}")
    if imp.note:
        print(f"    nota: {imp.note}")
    if pending != len(years):
        print(f"    {len(years) - pending} já concluído(s) numa execução anterior, {pending} restante(s)")
    print(f"    progresso geral: universidade {total}")
    while True:
        answer = input("    importar? [S]im / [n]ão / [t]odas as restantes / [q]cancelar tudo: ").strip().lower()
        if answer in ("", "s", "sim", "y"):
            return "sim"
        if answer in ("n", "nao", "não"):
            return "nao"
        if answer in ("t", "todas", "a"):
            return "todas"
        if answer in ("q", "sair", "quit"):
            return "sair"
        print("    responda com s, n, t ou q.")


# ── Credenciais ──────────────────────────────────────────────────────────────

_EMAIL_KEYS = {"email", "user", "usuario", "usuário", "username", "login", "owner_email"}
_PASSWORD_KEYS = {"password", "senha", "pass", "owner_password"}


def load_credentials(path: Path) -> tuple[Optional[str], Optional[str]]:
    """Lê e-mail e senha de um arquivo de texto. Aceita `chave=valor` (ou
    `chave: valor`), ignorando comentários com `#`; se não achar nenhuma
    chave conhecida, cai pro formato posicional (1ª linha e-mail, 2ª senha).
    Devolve (None, None) se o arquivo não existir — quem chama decide se
    isso é erro, já que --email/--password ainda podem suprir."""
    if not path.exists():
        return None, None

    email = password = None
    positional: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        key, sep, value = line.partition("=")
        if not sep:
            key, sep, value = line.partition(":")
        if sep:
            k, v = key.strip().lower(), value.strip()
            if k in _EMAIL_KEYS:
                email = v
                continue
            if k in _PASSWORD_KEYS:
                password = v
                continue
        positional.append(line)

    if email is None and len(positional) >= 1:
        email = positional[0]
    if password is None and len(positional) >= 2:
        password = positional[1]
    return email, password


# ── Cliente HTTP ─────────────────────────────────────────────────────────────

class BackendClient:
    def __init__(self, base_url: str, timeout: int = 120):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self._email: Optional[str] = None
        self._password: Optional[str] = None

    def login(self, email: str, password: str) -> None:
        resp = self.session.post(
            f"{self.base_url}/api/auth/login",
            data={"username": email, "password": password},
            timeout=self.timeout,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"login falhou ({resp.status_code}): {resp.text[:400]}")
        token = resp.json().get("access_token")
        if not token:
            raise RuntimeError(f"login não devolveu access_token: {resp.text[:400]}")
        self.session.headers["Authorization"] = f"Bearer {token}"
        # guarda pra relogin() poder repetir sem o chamador ter que
        # segurar a senha em outro lugar (usado quando o token expira
        # no meio de uma fila de horas — ver relogin()).
        self._email, self._password = email, password

    def relogin(self) -> bool:
        """Faz login de novo com as credenciais já usadas. Devolve False
        se ainda não tinha logado antes (nada a repetir)."""
        if not self._email or not self._password:
            return False
        self.login(self._email, self._password)
        return True

    def start_import(self, endpoint: str, params: dict) -> requests.Response:
        return self.session.post(
            f"{self.base_url}/api{endpoint}", params=params, timeout=self.timeout
        )

    def get_task(self, task_id: str) -> requests.Response:
        return self.session.get(
            f"{self.base_url}/api/owner/tasks/{task_id}", timeout=self.timeout
        )


# Status HTTP que valem retry: 429/503 saem do proxy do Render (plano free
# sob restart/OOM/capacidade), não da nossa aplicação — corpo vazio, sem o
# {"detail": ...} que o FastAPI sempre devolve. Backoff crescente, poucas
# tentativas: se persistir depois disso é falha real, não soluço passageiro.
_RETRYABLE_STATUS = (429, 503)
_RETRY_BACKOFF_SECONDS = (10, 30, 60)


def _call_with_retry(make_request, client, log_label: str):
    """Chama `make_request()` (uma função sem argumento que devolve a
    Response) tratando dois problemas conhecidos, sem contar como falha:

    - 401: o token expira (8h) no meio de filas longas — se `client` sabe
      relogar (BackendClient), reloga UMA vez e repete a mesma chamada.
    - 429/503: soluço do plano free do Render — espera com backoff
      crescente e repete, até _RETRY_BACKOFF_SECONDS se esgotar.

    Qualquer outro status (ou esses dois exaustos) devolve a Response como
    veio, pro chamador tratar exatamente como tratava antes."""
    relogged = False
    resp = make_request()
    for wait in _RETRY_BACKOFF_SECONDS:
        if resp.status_code == 401 and not relogged and hasattr(client, "relogin"):
            relogged = True
            try:
                if client.relogin():
                    log(f"  ...{log_label}: token expirado (401), relogado — repetindo", "  ")
                    resp = make_request()
                    continue
            except Exception as e:
                log(f"  ...{log_label}: relogin falhou ({e}) — seguindo com o 401 original", "!!")
                break
        if resp.status_code in _RETRYABLE_STATUS:
            log(f"  ...{log_label}: HTTP {resp.status_code} (provável soluço do Render) — "
                f"aguardando {wait}s e repetindo", "  ")
            time.sleep(wait)
            resp = make_request()
            continue
        break
    return resp


# ── Execução local (sem servidor) ────────────────────────────────────────────
#
# No modo --local os importadores rodam NESTA máquina e gravam direto no
# banco configurado em DATABASE_URL. Vale a pena porque o servidor do plano
# free tem 512 MB e derruba os importadores mais pesados por OOM, além de
# cortar em 8 minutos (`run_import_with_timeout`) — aqui não há esse teto.
#
# `LocalRunner` imita a interface de `BackendClient` (start_import/get_task
# devolvendo algo com .status_code e .json()), então `run_one` funciona igual
# nos dois modos, sem duplicar a lógica de espera e de log.


class _FakeResponse:
    def __init__(self, payload: dict, status_code: int = 200):
        self._payload = payload
        self.status_code = status_code
        self.text = json.dumps(payload, ensure_ascii=False, default=str)

    def json(self) -> dict:
        return self._payload


class LocalRunner:
    def __init__(self, importers: list[Importer]):
        self._target_by_endpoint = {i.endpoint: i.local_target for i in importers}
        # Importado só aqui pra o modo HTTP não precisar do backend instalado.
        from app.services.progress import create_task, get_task_status
        self._create_task = create_task
        self._get_task_status = get_task_status

    @staticmethod
    def _resolve(target: str):
        module_path, _, func_name = target.partition(":")
        import importlib
        return getattr(importlib.import_module(module_path), func_name)

    def check_database(self) -> str:
        """Falha cedo, com mensagem clara, se o banco não estiver acessível —
        melhor que descobrir isso no meio do primeiro importador."""
        from sqlalchemy import text
        from app.database import engine
        with engine.connect() as conn:
            conn.execute(text("select 1"))
        return str(engine.url).replace(f":{engine.url.password}@", ":***@") if engine.url.password else str(engine.url)

    def login(self, email: str, password: str) -> None:  # noqa: ARG002 - mesma interface
        return None

    def start_import(self, endpoint: str, params: dict) -> _FakeResponse:
        import asyncio
        import inspect as _inspect
        import threading

        target = self._target_by_endpoint.get(endpoint)
        if not target:
            return _FakeResponse({"detail": f"sem alvo local para {endpoint}"}, 404)
        try:
            func = self._resolve(target)
        except Exception as e:
            return _FakeResponse({"detail": f"não consegui importar {target}: {e}"}, 500)

        task_id = self._create_task()

        # Passa só os argumentos que a função aceita: as assinaturas variam
        # (algumas não têm until_year, outras exigem db posicional).
        call_kwargs = dict(params)
        call_kwargs["task_id"] = task_id
        try:
            sig = _inspect.signature(func)
            if not any(p.kind is _inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values()):
                call_kwargs = {k: v for k, v in call_kwargs.items() if k in sig.parameters}
        except (TypeError, ValueError):
            pass

        def _target():
            from app.services.progress import complete_task, fail_task, get_task_status
            try:
                result = asyncio.run(func(**call_kwargs)) if _inspect.iscoroutinefunction(func) \
                    else func(**call_kwargs)
                # Importadores que não recebem/usam task_id não fecham a
                # tarefa sozinhos; fecha aqui pra o laço de espera não ficar
                # preso num "running" que nunca muda.
                status = get_task_status(task_id) or {}
                if status.get("status") == "running":
                    complete_task(task_id, result if isinstance(result, dict) else {})
            except Exception as e:
                fail_task(task_id, f"{type(e).__name__}: {e}\n{traceback.format_exc()}")

        threading.Thread(target=_target, daemon=True).start()
        return _FakeResponse({"ok": True, "task_id": task_id})

    def get_task(self, task_id: str) -> _FakeResponse:
        status = self._get_task_status(task_id)
        if status is None:
            return _FakeResponse({"detail": "task not found"}, 404)
        return _FakeResponse(status)


# ── Estado e log de erros ────────────────────────────────────────────────────

class Journal:
    """Guarda o que já terminou (pra retomar) e registra cada falha em
    detalhe (pra corrigir depois)."""

    def __init__(self, state_path: Path, error_path: Path, restart: bool = False):
        self.state_path = state_path
        self.error_path = error_path
        self.done: set[str] = set()
        if state_path.exists() and not restart:
            try:
                self.done = set(json.loads(state_path.read_text()).get("done", []))
            except Exception:
                print(f"!! estado em {state_path} ilegível — começando do zero", flush=True)
        self.errors = 0

    @staticmethod
    def key(slug: str, year: Optional[int]) -> str:
        return f"{slug}:{year if year is not None else 'all'}"

    def is_done(self, slug: str, year: Optional[int]) -> bool:
        return self.key(slug, year) in self.done

    def mark_done(self, slug: str, year: Optional[int]) -> None:
        self.done.add(self.key(slug, year))
        tmp = self.state_path.with_suffix(self.state_path.suffix + ".tmp")
        tmp.write_text(json.dumps({"done": sorted(self.done)}, indent=2))
        tmp.replace(self.state_path)

    def log_error(self, **fields) -> None:
        self.errors += 1
        entry = {"timestamp": datetime.now(timezone.utc).isoformat(), **fields}
        with self.error_path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False, default=str) + "\n")


# ── Execução de uma unidade de trabalho ──────────────────────────────────────

def run_one(
    client: BackendClient,
    journal: Journal,
    imp: Importer,
    year: Optional[int],
    poll_interval: int,
    poll_timeout: int,
) -> bool:
    """Dispara UMA importação (uma universidade, um ano) e só devolve quando
    ela terminou de verdade. True se terminou bem."""
    params: dict = dict(imp.extra_params)
    if year is not None:
        params["since_year"] = year
        if imp.supports_until:
            params["until_year"] = year
    label = f"{imp.label} {year if year is not None else '(tudo)'}"
    started_at = time.time()

    if isinstance(client, LocalRunner):
        log(f"disparando {label} → local {imp.local_target} {params}")
    else:
        log(f"disparando {label} → POST /api{imp.endpoint} {params}")
    try:
        resp = _call_with_retry(lambda: client.start_import(imp.endpoint, params), client, label)
    except Exception as e:
        journal.log_error(
            stage="start", slug=imp.slug, university=imp.label, year=year,
            endpoint=imp.endpoint, params=params, error=str(e),
            traceback=traceback.format_exc(),
        )
        log(f"ERRO ao disparar {label}: {e}", "!!")
        return False

    if resp.status_code != 200:
        journal.log_error(
            stage="start", slug=imp.slug, university=imp.label, year=year,
            endpoint=imp.endpoint, params=params, http_status=resp.status_code,
            response_body=resp.text[:4000],
        )
        log(f"ERRO HTTP {resp.status_code} em {label}: {resp.text[:200]}", "!!")
        return False

    try:
        payload = resp.json()
    except ValueError:
        payload = {}

    task_id = payload.get("task_id") if isinstance(payload, dict) else None
    if not task_id:
        # Endpoint sem tarefa em background: a resposta já é o resultado final.
        log(f"{label}: concluído na própria resposta, sem tarefa em background "
            f"({elapsed(started_at)}) — {json.dumps(payload, ensure_ascii=False)[:300]}", "ok")
        return True

    log(f"tarefa {task_id} criada; aguardando terminar (consulta a cada {poll_interval}s, "
        f"limite {poll_timeout // 60} min)")

    waited = 0
    last_seen = None  # (current, total, última mensagem) — só loga quando muda
    while True:
        time.sleep(poll_interval)
        waited += poll_interval
        try:
            task_resp = _call_with_retry(lambda: client.get_task(task_id), client, f"{label} (poll)")
        except Exception as e:
            journal.log_error(
                stage="poll", slug=imp.slug, university=imp.label, year=year,
                endpoint=imp.endpoint, params=params, task_id=task_id,
                error=str(e), traceback=traceback.format_exc(),
            )
            log(f"ERRO ao consultar tarefa de {label}: {e}", "!!")
            return False

        if task_resp.status_code != 200:
            journal.log_error(
                stage="poll", slug=imp.slug, university=imp.label, year=year,
                endpoint=imp.endpoint, params=params, task_id=task_id,
                http_status=task_resp.status_code, response_body=task_resp.text[:4000],
            )
            log(f"ERRO HTTP {task_resp.status_code} lendo tarefa de {label}", "!!")
            return False

        task = task_resp.json() or {}
        status = task.get("status")
        logs = task.get("logs") or []
        last_msg = logs[-1].get("message") if logs else None
        seen = (task.get("current"), task.get("total"), last_msg)

        if status == "running":
            # Só imprime quando algo mudou de verdade, pra não poluir a saída
            # com uma linha idêntica a cada 10s de uma prova demorada.
            if seen != last_seen:
                current, total = task.get("current"), task.get("total")
                progress = f"{current}/{total}" if total else "sem contagem"
                detail = f" — {last_msg}" if last_msg else ""
                log(f"  ...{label}: {progress} [{elapsed(started_at)}]{detail}")
                last_seen = seen
            elif waited % 60 == 0:
                # Sinal de vida a cada minuto mesmo quando nada mudou, pra
                # deixar claro que travou no servidor e não no script.
                log(f"  ...{label}: sem mudança há {elapsed(started_at)}")

        if status == "completed":
            result = task.get("result") or {}
            added = result.get("total_added")
            extra = f", {added} questões adicionadas" if added is not None else ""
            log(f"{label}: OK em {elapsed(started_at)}{extra}", "ok")
            for msg in [l.get("message") for l in logs][-5:]:
                if msg:
                    log(f"     · {msg}")
            return True

        if status == "error":
            journal.log_error(
                stage="task", slug=imp.slug, university=imp.label, year=year,
                endpoint=imp.endpoint, params=params, task_id=task_id,
                task_error=task.get("error"),
                task_logs=[l.get("message") for l in logs][-25:],
            )
            log(f"FALHOU {label} após {elapsed(started_at)}: {str(task.get('error'))[:300]}", "!!")
            return False

        if waited >= poll_timeout:
            journal.log_error(
                stage="timeout", slug=imp.slug, university=imp.label, year=year,
                endpoint=imp.endpoint, params=params, task_id=task_id,
                waited_seconds=waited, last_status=status,
                progress=f"{task.get('current')}/{task.get('total')}",
                task_logs=[l.get("message") for l in logs][-25:],
            )
            log(f"TIMEOUT em {label} após {elapsed(started_at)} — a tarefa continua "
                f"rodando no servidor, seguindo para a próxima", "!!")
            return False


# ── Orquestração ─────────────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base-url", default=os.getenv("IMPORT_BASE_URL", "https://provas-khsq.onrender.com"))
    ap.add_argument("--credentials-file", default=os.getenv("IMPORT_OWNER_KEYS", "owner_keys.txt"),
                    help="arquivo com 'email=' e 'password=' do owner (padrão: owner_keys.txt)")
    ap.add_argument("--email", default=os.getenv("IMPORT_OWNER_EMAIL"),
                    help="sobrepõe o e-mail do arquivo de credenciais")
    ap.add_argument("--password", default=os.getenv("IMPORT_OWNER_PASSWORD"),
                    help="sobrepõe a senha do arquivo de credenciais")
    ap.add_argument("--yes", "-y", action="store_true",
                    help="não pergunta universidade por universidade, importa tudo")
    ap.add_argument("--local", action="store_true",
                    help="roda os importadores NESTA máquina, gravando direto no banco de "
                         "DATABASE_URL, em vez de chamar a API do servidor (sem o limite de "
                         "512 MB nem o corte de 8 min do plano free)")
    ap.add_argument("--only", help="lista de slugs separados por vírgula (ex.: udesc,uel)")
    ap.add_argument("--skip", help="slugs a pular, separados por vírgula")
    ap.add_argument("--start-from", help="começa nesse slug, mantendo a ordem do registro")
    ap.add_argument("--since", type=int, help="força o ano inicial de todas as universidades")
    ap.add_argument("--until", type=int, help="força o ano final de todas as universidades")
    ap.add_argument("--delay", type=int, default=5, help="pausa entre importações, em segundos (padrão: 5)")
    ap.add_argument("--poll-interval", type=int, default=10, help="intervalo entre consultas de progresso (padrão: 10s)")
    ap.add_argument("--poll-timeout", type=int, default=900,
                    help="tempo máximo por ano; acima do timeout de 8 min do backend (padrão: 900s)")
    ap.add_argument("--state-file", default="import_all_state.json")
    ap.add_argument("--error-log", default="import_all_errors.jsonl")
    ap.add_argument("--restart", action="store_true", help="ignora o estado salvo e refaz tudo")
    ap.add_argument("--dry-run", action="store_true", help="só lista o que seria importado")
    args = ap.parse_args()

    selected = IMPORTERS
    if args.start_from:
        slugs = [i.slug for i in selected]
        if args.start_from not in slugs:
            print(f"slug desconhecido em --start-from: {args.start_from}", file=sys.stderr)
            return 2
        selected = selected[slugs.index(args.start_from):]
    if args.only:
        wanted = {s.strip() for s in args.only.split(",") if s.strip()}
        selected = [i for i in selected if i.slug in wanted]
    if args.skip:
        unwanted = {s.strip() for s in args.skip.split(",") if s.strip()}
        selected = [i for i in selected if i.slug not in unwanted]
    if not selected:
        print("nenhuma universidade selecionada", file=sys.stderr)
        return 2

    # Plano: (importador, ano) na ordem em que serão executados.
    plan: list[tuple[Importer, Optional[int]]] = []
    for imp in selected:
        start = args.since or imp.first_year
        end = args.until or imp.last_year or _NEXT_YEAR
        if not imp.supports_until:
            # Endpoint que não fatia por ano: uma chamada só, do ano inicial em diante.
            plan.append((imp, start))
        else:
            plan.extend((imp, y) for y in range(start, end + 1))

    if args.dry_run:
        for imp, year in plan:
            suffix = " (chamada única, endpoint sem until_year)" if not imp.supports_until else ""
            print(f"{imp.label:<14} {year}{suffix}")
        print(f"\n{len(plan)} importações em {len(selected)} universidades")
        return 0

    if args.local:
        # Modo local: não há login (grava direto no banco), mas o timeout
        # padrão do modo HTTP (15 min, dimensionado pro corte de 8 min do
        # servidor) é curto demais pra importadores pesados rodando aqui.
        if args.poll_timeout == 900:
            args.poll_timeout = 7200
        os.chdir(Path(__file__).resolve().parent)  # pro .env e imports do app resolverem
        try:
            from dotenv import load_dotenv
            load_dotenv()
        except ImportError:
            pass
        try:
            runner = LocalRunner(selected)
            db_url = runner.check_database()
        except Exception as e:
            log(f"não consegui conectar no banco: {str(e)[:300]}", "!!")
            log("ajuste DATABASE_URL em backend/.env (a senha atual do Supabase está "
                "sendo recusada) e rode de novo", "!!")
            return 1
        log(f"modo LOCAL — importadores rodam nesta máquina", "ok")
        log(f"banco: {db_url}")
        faltando = [i.slug for i in selected if not i.local_target]
        if faltando:
            log(f"sem alvo local definido, serão puladas: {', '.join(faltando)}", "!!")
        return _run_queue(args, selected, plan, runner, interactive=(not args.yes and sys.stdin.isatty()))

    # Credenciais: --email/--password > variáveis de ambiente > owner_keys.txt.
    creds_path = Path(args.credentials_file)
    if not creds_path.is_absolute():
        creds_path = Path(__file__).resolve().parent / creds_path
    file_email, file_password = load_credentials(creds_path)
    email = args.email or file_email
    password = args.password or file_password
    if not email or not password:
        print(f"faltam credenciais: crie {creds_path} com as linhas 'email=...' e "
              f"'password=...', ou use --email/--password.", file=sys.stderr)
        return 2

    client = BackendClient(args.base_url)

    log(f"backend: {args.base_url}")
    log(f"credenciais: {email} (de {creds_path.name if file_email and not args.email else 'argumento/ambiente'})")
    try:
        client.login(email, password)
    except Exception as e:
        log(f"login falhou: {e}", "!!")
        return 1
    log(f"autenticado como owner", "ok")
    return _run_queue(args, selected, plan, client,
                      interactive=(args.yes is False and sys.stdin.isatty()))


def _run_queue(args, selected: list[Importer], plan: list[tuple[Importer, Optional[int]]],
               client, interactive: bool) -> int:
    """Seleção + execução da fila. Compartilhado pelos dois modos: `client` é
    um `BackendClient` (chama a API) ou um `LocalRunner` (roda aqui)."""
    journal = Journal(Path(args.state_file), Path(args.error_log), restart=args.restart)

    log(f"plano: {len(plan)} importações em {len(selected)} universidades "
        f"({len([1 for i, y in plan if journal.is_done(i.slug, y)])} já concluídas antes)")

    if not interactive and not args.yes:
        log("sem terminal interativo — importando tudo sem perguntar", "  ")

    # Agrupa por universidade preservando a ordem, pra perguntar uma vez por bloco.
    groups: list[tuple[Importer, list[Optional[int]]]] = []
    for imp, year in plan:
        if groups and groups[-1][0].slug == imp.slug:
            groups[-1][1].append(year)
        else:
            groups.append((imp, [year]))

    # ── Fase 1: escolher. Nada é baixado antes de todas as respostas ────────
    #
    # A seleção inteira acontece agora, de propósito: perguntar no meio da
    # fila obrigava a ficar de olho no terminal por horas, já que a próxima
    # pergunta só aparecia quando a universidade anterior terminava de
    # baixar. Aqui responde-se tudo de uma vez e depois pode largar rodando.
    ok = failed = skipped = declined = 0
    per_university: list[tuple[str, int, int, int]] = []  # label, ok, falhas, pulados
    chosen: list[tuple[Importer, list[Optional[int]], int]] = []  # imp, anos pendentes, já feitos
    ask_everything = not interactive

    for index, (imp, years) in enumerate(groups, start=1):
        pending = [y for y in years if not journal.is_done(imp.slug, y)]
        already = len(years) - len(pending)

        if not pending:
            log(f"{imp.label}: todos os {len(years)} anos já foram importados antes — pulando", "  ")
            skipped += len(years)
            continue

        if not ask_everything:
            answer = ask_university(imp, years, len(pending), f"{index}/{len(groups)}")
            if answer == "sair":
                log("seleção cancelada — nada foi importado", "  ")
                return 0
            if answer == "nao":
                declined += len(pending)
                continue
            if answer == "todas":
                ask_everything = True
                print("    (as universidades restantes entram sem perguntar)")

        chosen.append((imp, pending, already))

    if not chosen:
        log("nenhuma universidade selecionada — nada a fazer", "  ")
        return 0

    total_imports = sum(len(p) for _, p, _ in chosen)
    print()
    log(f"seleção final: {len(chosen)} universidade(s), {total_imports} importação(ões)")
    for imp, pending, already in chosen:
        span = (f"{pending[0]}–{pending[-1]}" if len(pending) > 1 else f"{pending[0]}")
        if not imp.supports_until:
            span = f"de {pending[0]} em diante (chamada única)"
        extra = f", {already} já feito(s)" if already else ""
        print(f"    {imp.label:<16} {len(pending):>3} ano(s)  {span}{extra}")
    if declined:
        log(f"{declined} ano(s) recusados na seleção")

    if interactive:
        print()
        confirm = input(f"  começar a importar isso agora? [S]im / [n]ão: ").strip().lower()
        if confirm not in ("", "s", "sim", "y"):
            log("cancelado antes de começar — nada foi importado", "  ")
            return 0

    # ── Fase 2: baixar. Daqui pra frente não há mais nenhuma pergunta ───────
    print()
    log(f"começando os downloads — {total_imports} importação(ões), sem mais perguntas")
    started = time.time()

    for index, (imp, pending, already) in enumerate(chosen, start=1):
        years_total = len(pending) + already
        print()
        log(f"══ {imp.label} [{imp.slug}] — {len(pending)} de {years_total} anos a importar "
            f"(universidade {index}/{len(chosen)})")
        if imp.note:
            log(f"   nota: {imp.note}")

        uni_ok = uni_failed = 0
        uni_started = time.time()
        for position, year in enumerate(pending, start=1):
            log(f"[{imp.label} {position}/{len(pending)}] ano {year}")
            if run_one(client, journal, imp, year, args.poll_interval, args.poll_timeout):
                journal.mark_done(imp.slug, year)
                ok += 1
                uni_ok += 1
            else:
                failed += 1
                uni_failed += 1
                # Falha de um ano não interrompe a fila: o próximo ano/universidade
                # continua, e o erro fica registrado para correção depois.
            if position < len(pending):
                time.sleep(args.delay)

        skipped += already
        per_university.append((imp.label, uni_ok, uni_failed, already))
        log(f"══ {imp.label}: {uni_ok} ok, {uni_failed} falhas em {elapsed(uni_started)}",
            "ok" if not uni_failed else "!!")
        if index < len(chosen):
            time.sleep(args.delay)

    total = int(time.time() - started)
    print()
    log("─── fim da execução ───")
    log(f"tempo total: {total // 3600}h{(total % 3600) // 60:02d}m{total % 60:02d}s")
    log(f"anos importados: {ok} | falhas: {failed} | já feitos antes: {skipped} | recusados: {declined}")
    if per_university:
        print()
        print(f"    {'universidade':<16} {'ok':>4} {'falhas':>7} {'antes':>6}")
        for label, u_ok, u_failed, u_skipped in per_university:
            print(f"    {label:<16} {u_ok:>4} {u_failed:>7} {u_skipped:>6}")
    if journal.errors:
        print()
        log(f"{journal.errors} falha(s) registradas em detalhe: {args.error_log}", "!!")
    log(f"estado (pra retomar de onde parou): {args.state_file}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
