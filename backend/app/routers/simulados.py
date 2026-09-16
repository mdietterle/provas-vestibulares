"""Router for Simulado (mock exam) feature."""
import json
import random
from collections import deque
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
import app.models
from app.models import (
    QuestionReport,
    Simulado,
    SimuladoQuestion,
    User,
)
from app.services.simulado_corrector import correct_simulado, _option_letter

router = APIRouter(prefix="/simulados", tags=["simulados"])

MAX_QUESTIONS_PER_SIMULADO = 50

# Conta de teste interna — sem limite de 1 simulado/dia, pra permitir testar
# a plataforma quantas vezes forem necessárias no mesmo dia.
UNLIMITED_SIMULADOS_EMAIL = "dietterle@gmail.com"

# Cada banco público de questões vira um "exam_type" de simulado. Não é
# permitido misturar bancos num mesmo simulado — o exam_type escolhido
# define de qual banco (e só dele) as questões são sorteadas.
EXAM_TYPE_MODELS: Dict[str, Any] = {}
for name, obj in vars(app.models).items():
    if name.endswith("Question") and name not in ("Question", "SimuladoQuestion", "BaseQuestion", "ExamQuestion"):
        if hasattr(obj, "__tablename__"):
            exam_type = name[:-8].lower()
            EXAM_TYPE_MODELS[exam_type] = obj

# Nome da coluna FK em SimuladoQuestion para cada tabela de origem.
_FK_FIELD_BY_TABLE = {
    obj.__tablename__: f"{exam_type}_question_id"
    for exam_type, obj in EXAM_TYPE_MODELS.items()
}


# Motivos fixos oferecidos ao aluno no "Reportar problema" — cobrem os
# defeitos reais já vistos nesta plataforma (enunciado quebrado, alternativa
# faltando/vazia, gabarito errado, sem alternativa nenhuma) + "outro" com
# texto livre.
REPORT_REASONS = {
    "statement_broken": "Enunciado incompleto, cortado ou misturado com outra questão",
    "missing_option": "Falta alternativa ou alguma está vazia",
    "wrong_answer": "Gabarito/resposta correta parece errado(a)",
    "image_missing": "Imagem da questão não aparece",
    "formatting": "Formatação ruim, difícil de ler",
    "other": "Outro",
}


# ── Pydantic schemas ──────────────────────────────────────────────────────────


class CreateSimuladoRequest(BaseModel):
    exam_type: str
    area: Optional[str] = None  # None = todas as áreas do banco
    num_questions: int = Field(20, ge=1, le=MAX_QUESTIONS_PER_SIMULADO)


class ReportQuestionRequest(BaseModel):
    reason: str
    details: Optional[str] = None


class AnswerItem(BaseModel):
    simulado_question_id: int
    selected_letter: str  # A-E


class SubmitAnswersRequest(BaseModel):
    answers: List[AnswerItem]


class UpdateProgressRequest(BaseModel):
    current_index: int
    answers: Optional[List[AnswerItem]] = None


# ── Helpers ───────────────────────────────────────────────────────────────────


def _serialize_option(opt, include_is_correct: bool = False) -> Dict[str, Any]:
    # _option_letter cobre modelos sem coluna `letter` própria (ex.:
    # UfscQuestionOption guarda `value`, não é a letra exibida ao aluno) —
    # deriva de `order`, que existe em todo modelo de opção.
    d: Dict[str, Any] = {"id": opt.id, "letter": _option_letter(opt), "text": opt.text, "order": opt.order}
    value = getattr(opt, "value", None)
    if isinstance(value, int):
        # Só existe em UfscQuestionOption — potência de 2 usada pra somar as
        # afirmativas marcadas na prova tipo somatório.
        d["value"] = value
    if include_is_correct:
        d["is_correct"] = opt.is_correct
    return d


def _underlying_question(sq: SimuladoQuestion):
    for exam_type in EXAM_TYPE_MODELS:
        q = getattr(sq, f"{exam_type}_question", None)
        if q is not None:
            return q
    return None


def _underlying_exam_type_and_id(sq: SimuladoQuestion) -> tuple[Optional[str], Optional[int]]:
    """(exam_type, question_id) da questão real por trás deste SimuladoQuestion
    — usado pra reportar/bloquear a questão no banco de origem, não só nesta
    tentativa de simulado."""
    for exam_type in EXAM_TYPE_MODELS:
        qid = getattr(sq, f"{exam_type}_question_id", None)
        if qid is not None:
            return exam_type, qid
    return None, None


def _blocked_question_ids(db: Session, exam_type: str) -> set[int]:
    """IDs de questões deste banco com denúncia pendente — excluídas do
    sorteio de novos simulados até o owner revisar (corrigir e liberar, ou
    excluir em definitivo)."""
    rows = (
        db.query(QuestionReport.question_id)
        .filter(QuestionReport.exam_type == exam_type, QuestionReport.status == "pending")
        .distinct()
        .all()
    )
    return {r[0] for r in rows}


def _normalize_selected_letters(sq: SimuladoQuestion, raw: str) -> str:
    """Valida e normaliza a resposta enviada pro aluno pra uma questão.

    Questão tipo "summation" (UFSC) aceita marcar VÁRIAS afirmativas
    (separadas por vírgula) — antes só aceitava uma letra A-E fixa, o que
    tornava impossível responder de verdade uma questão somatório (o aluno
    precisa poder marcar quantas afirmativas achar verdadeiras). Demais
    tipos continuam aceitando só uma letra, mas agora validada contra as
    letras reais da questão (não mais A-E fixo, que quebraria questões com
    mais de 5 alternativas)."""
    q = _underlying_question(sq)
    valid_letters = {_option_letter(opt) for opt in q.options} if q else set("ABCDE")
    is_summation = bool(q) and getattr(q, "question_type", None) == "summation"

    letters = [l.strip().upper() for l in raw.split(",") if l.strip()]
    if not letters:
        raise HTTPException(400, "Nenhuma alternativa selecionada")
    if not is_summation and len(letters) > 1:
        raise HTTPException(400, "Esta questão aceita só uma alternativa")
    invalid = [l for l in letters if l not in valid_letters]
    if invalid:
        raise HTTPException(400, f"Alternativa inválida: {', '.join(invalid)}")

    # Ordem estável (mesma da questão), sem duplicatas.
    ordered = sorted(set(letters), key=lambda l: (ord(l),))
    return ",".join(ordered)


def _serialize_sq(sq: SimuladoQuestion, include_result: bool = False) -> Dict[str, Any]:
    """Serialize a SimuladoQuestion for API response."""
    q = _underlying_question(sq)

    if q is None:
        return {"id": sq.id, "order": sq.order, "area": sq.area}

    options = [_serialize_option(opt, include_is_correct=include_result) for opt in q.options]

    def _as_data_uri(raw: str) -> str:
        # A maioria dos importadores já grava a data URI completa
        # ("data:image/png;base64,..."), mas pelo menos um (UFSC, antes
        # desta correção) gravava só o base64 cru — <img src={...}> vira URL
        # inválida pro navegador (ícone de imagem quebrada) mesmo com o PNG
        # certo no banco. Normaliza aqui pra cobrir dado antigo já salvo sem
        # o prefixo, sem depender de reimportar tudo de novo.
        return raw if raw.startswith("data:") else f"data:image/png;base64,{raw}"

    images = []
    main_img = getattr(q, "image_base64", None)
    if main_img:
        images.append(_as_data_uri(main_img))

    for img in getattr(q, "images", []):
        if hasattr(img, "image_base64") and img.image_base64:
            images.append(_as_data_uri(img.image_base64))

    result: Dict[str, Any] = {
        "id": sq.id,
        "order": sq.order,
        "area": sq.area,
        "statement": q.statement,
        "images": images,
        "options": options,
        "selected_letter": sq.selected_letter,
        # "summation" (UFSC) = múltipla marcação, soma dos valores das
        # afirmativas marcadas; senão, alternativa única de sempre.
        "question_type": getattr(q, "question_type", "single"),
    }

    if include_result:
        result["is_correct"] = sq.is_correct
        result["ai_feedback"] = sq.ai_feedback

    return result


def _serialize_simulado(simulado: Simulado, include_result: bool = False) -> Dict[str, Any]:
    enem_score_breakdown = None
    if simulado.enem_score_breakdown:
        try:
            enem_score_breakdown = json.loads(simulado.enem_score_breakdown)
        except (TypeError, ValueError):
            enem_score_breakdown = None

    return {
        "id": simulado.id,
        "exam_type": simulado.exam_type,
        "status": simulado.status,
        "current_index": simulado.current_index,
        "total_score": simulado.total_score,
        "enem_estimated_score": simulado.enem_estimated_score,
        "enem_score_breakdown": enem_score_breakdown,
        "created_at": simulado.created_at.isoformat() if simulado.created_at else None,
        "finished_at": simulado.finished_at.isoformat() if simulado.finished_at else None,
        "question_count": len(simulado.questions),
        "questions": [_serialize_sq(sq, include_result=include_result) for sq in simulado.questions],
    }


def _base_filters(model: Any, exam_type: str) -> List[Any]:
    """Filtros comuns: só questões com área definida, excluindo eletivas de
    língua estrangeira (nem todo banco tem esse campo — ex.: UfrgsQuestion) e,
    no caso da UFSC, restringindo ao formato somatório (objetivas)."""
    filters = [model.area.isnot(None)]
    if hasattr(model, "language"):
        filters.append(model.language.is_(None))
    if exam_type == "ufsc":
        filters.append(model.question_type == "summation")
    return filters


def _pick_questions(db: Session, exam_type: str, area: Optional[str], num_questions: int):
    """Sorteia até num_questions questões de um único banco (exam_type).

    Se `area` for informada, todas as questões vêm dessa área. Caso contrário,
    distribui o total entre as áreas disponíveis em rodízio (round-robin), para
    não concentrar o simulado numa única área quando o aluno não escolhe uma.
    """
    model = EXAM_TYPE_MODELS.get(exam_type)
    if model is None:
        raise ValueError(f"Unknown exam_type: {exam_type}")

    filters = _base_filters(model, exam_type)
    blocked_ids = _blocked_question_ids(db, exam_type)

    if area:
        areas = [area]
    else:
        area_rows = db.query(model.area).distinct().filter(*filters).all()
        areas = [r[0] for r in area_rows]

    # Busca só o ID primeiro, com "tem alternativa" resolvido em SQL (EXISTS),
    # não carregando a linha inteira (statement, image_base64 — em bancos
    # como UFSC chega a ter PNG de até alguns MB por questão) nem disparando
    # uma query extra por questão pra checar `len(q.options)` (N+1). Bancos
    # grandes como o da UFSC já derrubaram o processo por OOM no plano free
    # antes; carregar milhares de linhas inteiras só pra depois descartar a
    # maioria delas era desperdício evitável.
    options_model = getattr(model, "options").property.mapper.class_
    has_options_subq = (
        db.query(options_model.id)
        .filter(options_model.question_id == model.id)
        .exists()
    )

    pools: Dict[str, List[int]] = {}
    for a in areas:
        id_rows = (
            db.query(model.id)
            .filter(*filters, model.area == a, has_options_subq)
            .all()
        )
        ids = [r[0] for r in id_rows if r[0] not in blocked_ids]
        random.shuffle(ids)
        pools[a] = ids

    picked_ids: List[int] = []
    queue = deque(areas)
    while queue and len(picked_ids) < num_questions:
        a = queue.popleft()
        pool = pools[a]
        if pool:
            picked_ids.append(pool.pop())
            queue.append(a)

    # Só agora carrega a linha inteira — e só das poucas questões
    # efetivamente escolhidas, não de todo o banco filtrado.
    if not picked_ids:
        return [], areas
    rows_by_id = {q.id: q for q in db.query(model).filter(model.id.in_(picked_ids)).all()}
    picked = [rows_by_id[qid] for qid in picked_ids if qid in rows_by_id]

    return picked, areas


# ── Endpoints (static routes MUST come before /{id}) ─────────────────────────


@router.get("/today")
def today_simulado(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check whether the current student already has a simulado today."""
    # Mesma exceção de create_simulado — sem isto, a conta de teste seguia
    # vendo "Simulado de hoje já realizado" na tela mesmo com o limite
    # desativado no POST, porque esta consulta (usada pra decidir o que a
    # tela mostra) não sabia da exceção.
    if current_user.email.strip().lower() == UNLIMITED_SIMULADOS_EMAIL:
        return {"has_simulado": False, "simulado_id": None, "exam_type": None, "status": None}

    today = date.today()
    simulado = (
        db.query(Simulado)
        .filter(
            Simulado.student_id == current_user.id,
            func.date(Simulado.created_at) == today,
        )
        .first()
    )
    if simulado:
        return {"has_simulado": True, "simulado_id": simulado.id, "exam_type": simulado.exam_type, "status": simulado.status}
    return {"has_simulado": False, "simulado_id": None, "exam_type": None, "status": None}


@router.get("/areas")
def list_exam_type_areas(
    exam_type: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista as áreas/matérias disponíveis no banco de um exam_type, para o
    aluno escolher antes de iniciar o simulado."""
    exam_type = exam_type.lower()
    model = EXAM_TYPE_MODELS.get(exam_type)
    if model is None:
        raise HTTPException(400, f"exam_type deve ser um de: {', '.join(EXAM_TYPE_MODELS)}")

    filters = _base_filters(model, exam_type)
    rows = db.query(model.area).distinct().filter(*filters).order_by(model.area).all()
    return [r[0] for r in rows]


@router.get("/dashboard")
def dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return performance statistics for the current student."""
    all_simulados = (
        db.query(Simulado)
        .filter(Simulado.student_id == current_user.id)
        .order_by(Simulado.created_at.desc())
        .all()
    )

    completed = [s for s in all_simulados if s.status == "done"]
    scores = [s.total_score for s in completed if s.total_score is not None]

    # This week (Mon–Sun)
    today = date.today()
    week_start = today.toordinal() - today.weekday()
    simulados_this_week = sum(
        1 for s in all_simulados
        if s.created_at and s.created_at.toordinal() >= week_start
    )

    # By exam type
    by_exam_type: Dict[str, Any] = {}
    for s in all_simulados:
        et = s.exam_type
        if et not in by_exam_type:
            by_exam_type[et] = {"count": 0, "scores": []}
        by_exam_type[et]["count"] += 1
        if s.status == "done" and s.total_score is not None:
            by_exam_type[et]["scores"].append(s.total_score)
    by_exam_type_out = {
        et: {
            "count": v["count"],
            "avg_score": round(sum(v["scores"]) / len(v["scores"]), 2) if v["scores"] else None,
        }
        for et, v in by_exam_type.items()
    }

    # By area
    by_area: Dict[str, Dict[str, int]] = {}
    for s in completed:
        for sq in s.questions:
            if sq.is_correct is None:
                continue
            area = sq.area or "Sem área"
            if area not in by_area:
                by_area[area] = {"total": 0, "correct": 0}
            by_area[area]["total"] += 1
            if sq.is_correct:
                by_area[area]["correct"] += 1
    by_area_out = {
        area: {
            "total": v["total"],
            "correct": v["correct"],
            "pct": round(v["correct"] / v["total"] * 100, 1) if v["total"] > 0 else 0.0,
        }
        for area, v in by_area.items()
    }

    # Recent simulados (last 10)
    recent = [
        {
            "id": s.id,
            "exam_type": s.exam_type,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "total_score": s.total_score,
            "status": s.status,
        }
        for s in all_simulados[:10]
    ]

    return {
        "total_simulados": len(all_simulados),
        "completed_simulados": len(completed),
        "average_score": round(sum(scores) / len(scores), 2) if scores else None,
        "best_score": max(scores) if scores else None,
        "simulados_this_week": simulados_this_week,
        "by_exam_type": by_exam_type_out,
        "by_area": by_area_out,
        "recent_simulados": recent,
    }


# ── CRUD ──────────────────────────────────────────────────────────────────────


@router.post("", status_code=201)
def create_simulado(
    payload: CreateSimuladoRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new simulado for the current student (1 por dia, de um único banco)."""
    exam_type = payload.exam_type.lower()
    if exam_type not in EXAM_TYPE_MODELS:
        raise HTTPException(400, f"exam_type deve ser um de: {', '.join(EXAM_TYPE_MODELS)}")

    area = payload.area.strip() if payload.area and payload.area.strip() else None

    # Check daily limit — um simulado por dia no total, independente do banco escolhido.
    # Exceção: a conta de teste (UNLIMITED_SIMULADOS_EMAIL) nunca é bloqueada.
    is_unlimited = current_user.email.strip().lower() == UNLIMITED_SIMULADOS_EMAIL
    today = date.today()
    existing = (
        db.query(Simulado)
        .filter(
            Simulado.student_id == current_user.id,
            func.date(Simulado.created_at) == today,
            # Simulados que travaram com falha na correção não contam pro
            # limite diário — sem isso, uma correção que falhou (ex.:
            # instabilidade da IA) bloqueava o aluno de tentar de novo até o
            # dia seguinte, mesmo sem culpa dele.
            Simulado.status != "error",
        )
        .first()
        if not is_unlimited else None
    )
    if existing:
        raise HTTPException(429, "Você já realizou um simulado hoje. Volte amanhã!")

    # Pick questions — todas de um único banco (exam_type); não mistura instituições.
    try:
        questions, _ = _pick_questions(db, exam_type, area, payload.num_questions)
    except ValueError as e:
        raise HTTPException(400, str(e))

    if not questions:
        raise HTTPException(400, "Desculpe, ainda não temos questões suficientes para gerar um simulado com esses filtros. Tente escolher outra área ou deixe o filtro de matéria em branco.")

    # Shuffle the questions so area groups are interleaved
    random.shuffle(questions)

    # Create Simulado
    simulado = Simulado(
        student_id=current_user.id,
        exam_type=exam_type,
        status="pending",
    )
    db.add(simulado)
    db.flush()

    # Create SimuladoQuestion records
    for order, q in enumerate(questions, start=1):
        table = q.__class__.__tablename__
        sq = SimuladoQuestion(
            simulado_id=simulado.id,
            order=order,
            area=q.area,
        )
        setattr(sq, _FK_FIELD_BY_TABLE[table], q.id)
        db.add(sq)

    db.commit()
    db.refresh(simulado)

    return _serialize_simulado(simulado, include_result=False)


@router.get("")
def list_simulados(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all simulados for the current student."""
    simulados = (
        db.query(Simulado)
        .filter(Simulado.student_id == current_user.id)
        .order_by(Simulado.created_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "exam_type": s.exam_type,
            "status": s.status,
            "total_score": s.total_score,
            "enem_estimated_score": s.enem_estimated_score,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "finished_at": s.finished_at.isoformat() if s.finished_at else None,
            "question_count": len(s.questions),
            "areas": list({sq.area for sq in s.questions if sq.area}),
        }
        for s in simulados
    ]


@router.get("/report-reasons")
def get_report_reasons():
    """Lista fixa de motivos pro formulário de 'Reportar problema' do aluno.
    Precisa vir ANTES de /{simulado_id} — rota estática depois da genérica
    nunca é alcançada (FastAPI casa por ordem de registro; "report-reasons"
    seria interpretado como simulado_id e falhava com 422)."""
    return [{"value": k, "label": v} for k, v in REPORT_REASONS.items()]


@router.get("/{simulado_id}")
def get_simulado(
    simulado_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a simulado with all its questions."""
    simulado = db.get(Simulado, simulado_id)
    if not simulado or simulado.student_id != current_user.id:
        raise HTTPException(404, "Simulado não encontrado")

    include_result = simulado.status == "done"
    return _serialize_simulado(simulado, include_result=include_result)


@router.patch("/{simulado_id}/progress")
def update_progress(
    simulado_id: int,
    payload: UpdateProgressRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update progress for a pending simulado."""
    simulado = db.get(Simulado, simulado_id)
    if not simulado or simulado.student_id != current_user.id:
        raise HTTPException(404, "Simulado não encontrado")
    if simulado.status != "pending":
        raise HTTPException(400, f"Simulado já está em status '{simulado.status}'")

    simulado.current_index = payload.current_index

    if payload.answers:
        sq_map = {sq.id: sq for sq in simulado.questions}
        for answer in payload.answers:
            sq = sq_map.get(answer.simulado_question_id)
            if not sq:
                raise HTTPException(400, f"Questão {answer.simulado_question_id} não pertence a este simulado")
            sq.selected_letter = _normalize_selected_letters(sq, answer.selected_letter)

    db.commit()
    return {"status": "ok"}


@router.post("/questions/{sq_id}/report", status_code=201)
def report_question(
    sq_id: int,
    payload: ReportQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aluno reporta problema numa questão do simulado. A questão sai do
    sorteio de novos simulados imediatamente (ver _blocked_question_ids) até
    o owner revisar em /owner/question-reports."""
    sq = db.query(SimuladoQuestion).join(Simulado).filter(
        SimuladoQuestion.id == sq_id,
        Simulado.student_id == current_user.id,
    ).first()
    if not sq:
        raise HTTPException(404, "Questão não encontrada no simulado")

    if payload.reason not in REPORT_REASONS:
        raise HTTPException(400, f"Motivo inválido. Use um de: {', '.join(REPORT_REASONS)}")
    if payload.reason == "other" and not (payload.details or "").strip():
        raise HTTPException(400, "Descreva o problema em 'Outro'")

    exam_type, question_id = _underlying_exam_type_and_id(sq)
    if not exam_type or not question_id:
        raise HTTPException(404, "Questão base não encontrada")

    report = QuestionReport(
        exam_type=exam_type,
        question_id=question_id,
        student_id=current_user.id,
        reason=payload.reason,
        details=(payload.details or "").strip() or None,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"id": report.id, "status": "ok"}


@router.post("/questions/{sq_id}/format")
def format_question_statement(
    sq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Format question statement using Groq AI without altering the semantic meaning."""
    sq = db.query(SimuladoQuestion).join(Simulado).filter(
        SimuladoQuestion.id == sq_id,
        Simulado.student_id == current_user.id
    ).first()
    if not sq:
        raise HTTPException(status_code=404, detail="Questão não encontrada no simulado")

    q = None
    for exam_type in EXAM_TYPE_MODELS:
        q = getattr(sq, f"{exam_type}_question", None)
        if q is not None:
            break

    if not q:
        raise HTTPException(status_code=404, detail="Questão base não encontrada")

    # Marcador de versão do prompt de formatação: sem isto, uma questão já
    # tocada pela versão antiga/fraca (que só quebrava linha, sem separar
    # diálogo) ficava presa pra sempre — o cache antigo só olhava se havia
    # QUALQUER "<br>"/"<p>", então nunca reprocessava com um prompt melhor.
    _FORMAT_MARKER = "<!--groq-fmt-v2-->"
    if _FORMAT_MARKER in q.statement:
        return {"id": sq.id, "formatted_statement": q.statement}

    from app.services.ai_corrector import _call_groq
    
    prompt = f"""Você é um diagramador formatando o enunciado de uma questão de vestibular pra
ficar fácil de ler na tela (hoje sai como um bloco de texto corrido, difícil de acompanhar).

REGRAS DE CONTEÚDO (não pode violar):
1. Não altere, adicione, remova ou reordene NENHUMA palavra do texto original.
2. Não corrija ortografia/gramática do texto original, mesmo que pareça errado.
3. Retorne APENAS o HTML do enunciado formatado — sem texto introdutório, sem explicações, sem markdown (```).

REGRAS DE FORMATAÇÃO (aplique o que fizer sentido pro texto, use HTML simples):
- Se houver diálogo (frases separadas por "-", travessão, ou alternando dois falantes), coloque
  CADA fala em sua própria linha, usando <br><br> entre elas — hoje tudo fica emendado num só parágrafo.
- Separe claramente onde o diálogo/texto de apoio termina e onde o comando da questão começa
  (a pergunta em si, geralmente no fim, começando com algo como "Considerando..." ou uma pergunta
  direta) — coloque em um parágrafo <p> separado, com <br><br> antes.
- Use <strong> para destacar números, unidades, nomes próprios e termos técnicos centrais pro
  que a questão pede (ex.: <strong>95 aminoácidos</strong>, <strong>RNA mensageiro</strong>).
- Use <em> para ênfase em falas ou expressões, quando fizer sentido.
- Pode usar cor com moderação, SÓ com <span style="color:#a78bfa"> (destaque roxo, pro comando
  final da questão / o que de fato precisa ser respondido) e/ou <span style="color:#93c5fd">
  (azul claro, pra dados numéricos importantes do enunciado) — o fundo é escuro, então use
  APENAS essas duas cores exatas, nunca outra, e nunca em texto longo (só palavras/trechos curtos).
- Envolva parágrafos em <p>...</p>. Não use markdown (**negrito**, *itálico*) — só tags HTML.

Texto original:
{q.statement}"""

    try:
        # json_mode=False: este prompt pede HTML solto, não JSON — com o
        # modo json_object (padrão de _call_groq, usado pra correção) a
        # chamada falhava sempre, e a formatação nunca era aplicada.
        formatted = _call_groq(prompt, json_mode=False)
        # Avoid overriding with error messages if groq fails to obey rules completely
        if formatted and len(formatted.strip()) > 10:
            q.statement = formatted.strip() + _FORMAT_MARKER
            db.commit()
    except Exception as e:
        print(f"Erro ao formatar enunciado com Groq: {e}")
        raise HTTPException(status_code=500, detail="Erro ao formatar questão com IA")
    
    return {"id": sq.id, "formatted_statement": q.statement}


@router.post("/{simulado_id}/submit")
def submit_simulado(
    simulado_id: int,
    payload: SubmitAnswersRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit answers for a simulado and trigger background correction."""
    simulado = db.get(Simulado, simulado_id)
    if not simulado or simulado.student_id != current_user.id:
        raise HTTPException(404, "Simulado não encontrado")
    # "error" = a correção anterior falhou (ex.: instabilidade da IA) e o
    # simulado ficou preso — deixa reenviar em vez de travar o aluno até o
    # dia seguinte (ver services/simulado_corrector.py).
    if simulado.status not in ("pending", "error"):
        raise HTTPException(400, f"Simulado já está em status '{simulado.status}'")

    # Build a lookup map for fast access
    sq_map = {sq.id: sq for sq in simulado.questions}

    for answer in payload.answers:
        sq = sq_map.get(answer.simulado_question_id)
        if not sq:
            raise HTTPException(400, f"Questão {answer.simulado_question_id} não pertence a este simulado")
        sq.selected_letter = _normalize_selected_letters(sq, answer.selected_letter)

    simulado.status = "correcting"
    db.commit()

    # Kick off background correction
    background_tasks.add_task(correct_simulado, simulado_id)

    return {"simulado_id": simulado_id, "status": "correcting"}


@router.get("/{simulado_id}/result")
def get_result(
    simulado_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get correction result for a completed simulado."""
    simulado = db.get(Simulado, simulado_id)
    if not simulado or simulado.student_id != current_user.id:
        raise HTTPException(404, "Simulado não encontrado")
    if simulado.status != "done":
        raise HTTPException(400, f"Simulado ainda não foi corrigido (status: {simulado.status})")

    return _serialize_simulado(simulado, include_result=True)
