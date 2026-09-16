#!/usr/bin/env python3
"""
Importador de vestibular por universidade — script externo, roda só no terminal.

NÃO faz parte do frontend/backend buildado — é uma ferramenta de operação manual
pro owner rodar importações completas sem depender da tela web (que mantém a
conexão HTTP presa a um browser aberto e não sobrevive a um F5 acidental).

O que ele faz:
  1. Pergunta (ou lê da env/flag) qual universidade importar.
  2. Descobre automaticamente o endpoint de import em massa daquela universidade
     lendo o /openapi.json do próprio backend em produção — não tem lista de
     endpoints hardcoded aqui, então continua funcionando se novas universidades
     forem adicionadas depois.
  3. Importa UM ANO DE CADA VEZ, do mais antigo pro mais recente — só chama o
     endpoint do próximo ano depois que a task do ano anterior terminar
     (completed ou error). Isso existe porque descobrimos que pedir vários anos
     de uma vez num request só faz o processo em background acumular memória e
     ser morto por OOM no meio (Render free tier, 512MB) — indo ano a ano, cada
     chamada é uma unidade de trabalho pequena e isolada, então mesmo que uma
     dê problema, as outras não são afetadas e o processo nunca acumula estado
     de mais de um ano por vez.
  4. Se um ano falhar (erro de rede, timeout, site fora do ar), REGISTRA o erro
     e continua pro próximo ano — nunca aborta a importação inteira por causa
     de um ano problemático (mesma filosofia dos importadores: reportar honesto
     em vez de travar tudo).
  5. Ctrl+C a qualquer momento para parar com segurança — imprime um resumo do
     que já foi importado antes de sair.

Uso:
    python3 scripts/import_university.py
    python3 scripts/import_university.py --university unioeste --since 2015 --until 2026
    python3 scripts/import_university.py --list

Credenciais e sessão (pra não precisar digitar toda hora):
  1. Variáveis de ambiente OWNER_EMAIL / OWNER_PASSWORD, se definidas.
  2. Senão, ~/.provas_owner_credentials (formato EMAIL=... / PASSWORD=...,
     criado com permissão 600 — só o seu usuário lê). Na primeira vez que
     você digitar interativamente, o script oferece salvar aí.
  3. Senão, pergunta interativamente (senha não aparece na tela).
Nunca coloque a senha na linha de comando (fica no histórico do shell).

Além disso, o token de login é cacheado em ~/.provas_owner_session.json e
reaproveitado entre execuções enquanto for válido (o backend expira o token
em 8h) — então mesmo digitando a senha uma vez, as próximas chamadas dentro
dessa janela não pedem login de novo.
"""

from __future__ import annotations

import argparse
import base64
import getpass
import json
import os
import stat
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("Este script precisa do pacote 'requests'. Instale com: pip install requests")
    sys.exit(1)

DEFAULT_BASE_URL = "https://provas-khsq.onrender.com"
CREDENTIALS_FILE = Path.home() / ".provas_owner_credentials"
TOKEN_CACHE_FILE = Path.home() / ".provas_owner_session.json"

# Códigos que indicam indisponibilidade PASSAGEIRA, não um erro real do pedido:
# o Render tira o container do ar por ~1-2min a cada deploy (o nosso, gerado
# pelos commits que fomos empurrando) — um 502/503/504 nessa janela não
# significa que o ano falhou, só que bateu na hora errada. Vale tentar de novo.
TRANSIENT_STATUS_CODES = {502, 503, 504}
RETRY_ATTEMPTS = 6
RETRY_BACKOFF_SECONDS = 5


def request_with_retry(method: str, url: str, **kwargs) -> requests.Response:
    last_exc: Exception | None = None
    for attempt in range(1, RETRY_ATTEMPTS + 1):
        try:
            resp = requests.request(method, url, **kwargs)
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            last_exc = e
        else:
            if resp.status_code not in TRANSIENT_STATUS_CODES:
                return resp
            last_exc = requests.exceptions.HTTPError(f"{resp.status_code} transitório em {url}")

        if attempt < RETRY_ATTEMPTS:
            wait = RETRY_BACKOFF_SECONDS * attempt
            print(f"    (indisponibilidade passageira — provavelmente um deploy em andamento — "
                  f"tentativa {attempt}/{RETRY_ATTEMPTS}, esperando {wait}s...)")
            time.sleep(wait)
    raise last_exc

# Caminhos que existem mas não são "importar tudo" (import de uma questão avulsa,
# upload manual de PDF/URL, reseed do banco estático local) — não entram no menu.
EXCLUDED_PATH_HINTS = ("import-pdf", "import-url", "run-seed")


def discover_universities(base_url: str) -> dict[str, dict]:
    """Lê o /openapi.json do backend e monta {chave: {path, label}} só com os
    endpoints de import em massa (aceitam since_year, não são upload manual)."""
    resp = request_with_retry("GET", f"{base_url}/openapi.json", timeout=30)
    resp.raise_for_status()
    schema = resp.json()

    universities: dict[str, dict] = {}
    for path, methods in schema.get("paths", {}).items():
        post = methods.get("post")
        if not post:
            continue
        if any(hint in path for hint in EXCLUDED_PATH_HINTS):
            continue
        params = {p["name"] for p in post.get("parameters", [])}
        if "since_year" not in params:
            continue
        has_until = "until_year" in params

        # /api/{key}-questions/admin/import-all  OU  /api/{key}/import
        if "-questions/admin/import-all" in path:
            key = path.split("/")[2].removesuffix("-questions")
        elif path.endswith("/import"):
            key = path.rsplit("/", 2)[-2]
        else:
            continue

        universities[key] = {"path": path, "has_until": has_until}
    return universities


def _write_private_file(path: Path, content: str) -> None:
    path.write_text(content)
    path.chmod(stat.S_IRUSR | stat.S_IWUSR)  # 600 — só o dono lê/escreve


def load_saved_credentials() -> tuple[str, str] | None:
    if not CREDENTIALS_FILE.exists():
        return None
    values: dict[str, str] = {}
    for line in CREDENTIALS_FILE.read_text().splitlines():
        if "=" in line:
            key, _, val = line.partition("=")
            values[key.strip().upper()] = val.strip()
    email, password = values.get("EMAIL"), values.get("PASSWORD")
    if email and password:
        return email, password
    return None


def maybe_save_credentials(email: str, password: str) -> None:
    answer = input(f"Salvar essas credenciais em {CREDENTIALS_FILE} pra não digitar de novo? [s/N] ").strip().lower()
    if answer == "s":
        _write_private_file(CREDENTIALS_FILE, f"EMAIL={email}\nPASSWORD={password}\n")
        print(f"Salvo em {CREDENTIALS_FILE} (permissão 600).")


def get_credentials() -> tuple[str, str]:
    env_email, env_password = os.environ.get("OWNER_EMAIL"), os.environ.get("OWNER_PASSWORD")
    if env_email and env_password:
        return env_email, env_password

    saved = load_saved_credentials()
    if saved:
        return saved

    email = input("E-mail do owner: ").strip()
    password = getpass.getpass("Senha do owner: ")
    maybe_save_credentials(email, password)
    return email, password


def _decode_jwt_exp(token: str) -> float | None:
    try:
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        return payload.get("exp")
    except Exception:
        return None


def load_cached_token(base_url: str) -> str | None:
    if not TOKEN_CACHE_FILE.exists():
        return None
    try:
        cache = json.loads(TOKEN_CACHE_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return None
    if cache.get("base_url") != base_url:
        return None
    token = cache.get("token")
    exp = cache.get("exp")
    if not token or not exp:
        return None
    if datetime.now(timezone.utc).timestamp() >= exp - 60:  # margem de 1min
        return None
    # O token pode ter expirado no servidor por outro motivo (ex.: reinício
    # do backend que troque o SECRET_KEY) — confirma com uma chamada barata
    # antes de confiar nele.
    try:
        resp = requests.get(f"{base_url}/api/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        if resp.status_code == 200:
            return token
    except requests.exceptions.RequestException:
        pass
    return None


def save_token_cache(base_url: str, token: str) -> None:
    exp = _decode_jwt_exp(token)
    if not exp:
        return
    _write_private_file(TOKEN_CACHE_FILE, json.dumps({"base_url": base_url, "token": token, "exp": exp}))


def login(base_url: str, email: str, password: str) -> str:
    resp = request_with_retry(
        "POST", f"{base_url}/api/auth/login",
        data={"username": email, "password": password},
        timeout=30,
    )
    if resp.status_code == 401:
        raise SystemExit("Login falhou: e-mail ou senha incorretos.")
    resp.raise_for_status()
    token = resp.json().get("access_token")
    if not token:
        raise SystemExit(f"Login não retornou access_token: {resp.text[:300]}")
    return token


def get_token(base_url: str) -> str:
    cached = load_cached_token(base_url)
    if cached:
        print("Sessão reaproveitada (cache local) — sem precisar logar de novo.")
        return cached

    email, password = get_credentials()
    print("Fazendo login...")
    token = login(base_url, email, password)
    save_token_cache(base_url, token)
    print("Login OK.")
    return token


def call_import(base_url: str, token: str, path: str, year: int, has_until: bool) -> dict:
    params = {"since_year": year}
    if has_until:
        params["until_year"] = year
    else:
        # Endpoint não tem teto de ano — passar assim mesmo é inofensivo (o
        # FastAPI ignora parâmetro que a rota não declara), mas nesse caso o
        # backend provavelmente vai varrer de `year` até o ano atual sozinho,
        # não só o ano pedido. Avisamos isso uma vez no chamador.
        params["until_year"] = year
    resp = request_with_retry("POST", f"{base_url}{path}", params=params,
                               headers={"Authorization": f"Bearer {token}"}, timeout=60)
    resp.raise_for_status()
    return resp.json()


class TaskLost(Exception):
    """A task_id parou de existir no servidor — quase sempre porque o processo
    reiniciou (deploy nosso, ou o próprio Render matando o container) enquanto
    a importação daquele ano estava rodando em background. O estado da task
    vive só em memória do processo (não é persistido), então um restart apaga
    tudo — não tem como saber se aquele ano terminou de importar ou não."""


def poll_task(base_url: str, token: str, task_id: str, year: int) -> dict:
    last_log = None
    while True:
        resp = request_with_retry(
            "GET", f"{base_url}/api/owner/tasks/{task_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        if resp.status_code == 404:
            raise TaskLost(f"task {task_id} não encontrada — o processo provavelmente reiniciou no meio.")
        resp.raise_for_status()
        data = resp.json()

        logs = data.get("logs") or []
        if logs and logs[-1]["message"] != last_log:
            last_log = logs[-1]["message"]
            items = data.get("items_done")
            items_txt = f" | {items} questões importadas" if items is not None else ""
            print(f"    [{year}] {data.get('current', 0)}/{data.get('total', 1)}{items_txt} — {last_log}")

        if data.get("status") in ("completed", "error"):
            return data
        time.sleep(2)


def import_all_years(base_url: str, token: str, university: str, path: str,
                      has_until: bool, since: int, until: int) -> None:
    if not has_until:
        print(f"  aviso: {university} não tem parâmetro until_year — cada chamada "
              f"provavelmente vai varrer de {{ano}} até o ano corrente sozinha, não "
              f"só o ano pedido. É seguro rodar mesmo assim (idempotente), só não é "
              f"estritamente 'um ano por vez' nesse caso específico.")

    total_added = 0
    failed_years: list[int] = []
    lost_years: list[int] = []

    for year in range(since, until + 1):
        print(f"\n== {university} — ano {year} ==")
        try:
            result = call_import(base_url, token, path, year, has_until)
        except requests.exceptions.RequestException as e:
            print(f"  ❌ Falha ao iniciar a importação de {year} (mesmo após retentativas): {e}")
            failed_years.append(year)
            continue

        task_id = result.get("task_id")
        if not task_id:
            # Endpoint síncrono (sem task) — já veio o resultado direto.
            added = result.get("total_added", 0)
            total_added += added
            print(f"  ✅ {added} questões importadas (síncrono).")
            continue

        try:
            final = poll_task(base_url, token, task_id, year)
        except TaskLost:
            # Não é um erro de importação — é o processo tendo reiniciado
            # (deploy nosso, ou o Render por conta própria) enquanto esse ano
            # rodava. Pode ter terminado com sucesso ou não, não tem como
            # saber a partir daqui. Registra separado de "falha real" pra não
            # confundir com um problema no site da universidade.
            print(f"  ⚠️  A task de {year} foi perdida — o backend reiniciou no meio "
                  f"(provavelmente um deploy). Não sabemos se terminou. Re-rode esse "
                  f"ano depois pra garantir (é idempotente, não duplica).")
            lost_years.append(year)
            continue
        except requests.exceptions.RequestException as e:
            print(f"  ❌ Perdi a conexão acompanhando a task de {year} (mesmo após retentativas): {e}")
            failed_years.append(year)
            continue

        if final.get("status") == "error":
            print(f"  ❌ Ano {year} terminou com erro: {final.get('error')}")
            failed_years.append(year)
        else:
            added = (final.get("result") or {}).get("total_added", final.get("items_done") or 0)
            total_added += added or 0
            print(f"  ✅ Ano {year} concluído — {added or 0} questões importadas.")

        # Respiro curto entre anos: nada técnico exige isso (cada chamada já é
        # síncrona até a task terminar), é só pra não martelar o servidor sem
        # necessidade entre uma chamada e outra.
        time.sleep(1)

    print(f"\n===== {university}: concluído =====")
    print(f"Total de questões importadas: {total_added}")
    if failed_years:
        print(f"Anos com erro real (revise manualmente): {failed_years}")
    if lost_years:
        print(f"Anos com resultado desconhecido (backend reiniciou no meio — re-rode pra garantir): {lost_years}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default=os.environ.get("PROVAS_BASE_URL", DEFAULT_BASE_URL))
    parser.add_argument("--university", help="Chave da universidade (ex.: unioeste, enem, ufsc). Se omitido, mostra um menu.")
    parser.add_argument("--since", type=int, default=2000, help="Ano inicial (padrão: 2000)")
    parser.add_argument("--until", type=int, default=date.today().year, help="Ano final (padrão: ano atual)")
    parser.add_argument("--list", action="store_true", help="Só lista as universidades disponíveis e sai.")
    args = parser.parse_args()

    print(f"Descobrindo importadores disponíveis em {args.base_url} ...")
    universities = discover_universities(args.base_url)
    if not universities:
        raise SystemExit("Nenhum endpoint de import em massa encontrado — o backend está no ar?")

    if args.list or not args.university:
        print("\nUniversidades disponíveis:")
        for key in sorted(universities):
            print(f"  - {key}")
        if args.list:
            return

    university = args.university
    if not university:
        university = input("\nQual universidade importar? ").strip().lower()

    if university not in universities:
        raise SystemExit(f"'{university}' não tem endpoint de import em massa conhecido. Use --list para ver as opções.")

    if args.since > args.until:
        raise SystemExit("--since não pode ser maior que --until.")

    token = get_token(args.base_url)

    info = universities[university]
    try:
        import_all_years(args.base_url, token, university, info["path"], info["has_until"], args.since, args.until)
    except KeyboardInterrupt:
        print("\n\nInterrompido pelo usuário (Ctrl+C). A task do ano em andamento continua "
              "rodando no servidor em background — só o script parou de acompanhar.")
        sys.exit(130)


if __name__ == "__main__":
    main()
