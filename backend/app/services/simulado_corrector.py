"""Background correction service for Simulado (mock exam)."""
import json
import re
import time
from datetime import datetime, timezone

from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy import bindparam, inspect as sa_inspect, text
from sqlalchemy.orm import Session, object_session

import app.models
from app.core.config import settings
from app.database import SessionLocal
from app.models import Simulado, SimuladoQuestion
from app.services.enem.scoring import build_score_breakdown
from app.vestibular.models import VestibularQuestion


# ── Questão por trás de um SimuladoQuestion ───────────────────────────────────
#
# Simulados novos apontam pra tabela unificada `vestibular_questions`
# (SimuladoQuestion.vestibular_question_id + vq_exam_type). Simulados antigos
# apontam pras tabelas legadas por banco (enem_questions, ufsc_questions, ...)
# por colunas `<exam_type>_question_id` que continuam existindo no Postgres,
# mas que não são mais mapeadas no ORM — por isso são lidas aqui via SQL cru,
# só as colunas que de fato existem no banco.

LEGACY_EXAM_TYPE_MODELS: Dict[str, Any] = {}
for _name, _obj in vars(app.models).items():
    if _name.endswith("Question") and _name not in ("Question", "SimuladoQuestion", "BaseQuestion", "ExamQuestion"):
        if hasattr(_obj, "__tablename__"):
            LEGACY_EXAM_TYPE_MODELS[_name[:-8].lower()] = _obj

_LEGACY_FK_COLS_CACHE: Dict[int, List[str]] = {}
_UNSET = object()


def _legacy_fk_columns(db: Session) -> List[str]:
    bind = db.get_bind()
    key = id(bind)
    cols = _LEGACY_FK_COLS_CACHE.get(key)
    if cols is None:
        # Reflete pela conexão da própria sessão (não abre outra conexão do pool).
        try:
            existing = {c["name"] for c in sa_inspect(db.connection()).get_columns("simulado_questions")}
        except Exception as exc:
            print(f"⚠️  simulado: não consegui ler colunas de simulado_questions: {exc}")
            existing = set()
        cols = [f"{et}_question_id" for et in LEGACY_EXAM_TYPE_MODELS if f"{et}_question_id" in existing]
        _LEGACY_FK_COLS_CACHE[key] = cols
    return cols


def attach_underlying_questions(db: Session, sqs: Iterable[SimuladoQuestion]) -> None:
    """Resolve em lote (uma query por banco) a questão legada dos
    SimuladoQuestion antigos, sem vestibular_question_id. Guarda o resultado
    no próprio objeto (_legacy_ref / _legacy_question)."""
    pending = [
        sq for sq in sqs
        if sq.vestibular_question_id is None and getattr(sq, "_legacy_question", _UNSET) is _UNSET
    ]
    if not pending:
        return
    for sq in pending:
        sq._legacy_ref = None
        sq._legacy_question = None

    cols = _legacy_fk_columns(db)
    if not cols:
        return

    stmt = text(
        f"SELECT id, {', '.join(cols)} FROM simulado_questions WHERE id IN :ids"
    ).bindparams(bindparam("ids", expanding=True))
    rows = db.execute(stmt, {"ids": [sq.id for sq in pending]}).fetchall()

    refs: Dict[int, tuple] = {}
    ids_by_type: Dict[str, set] = {}
    for row in rows:
        for col, val in zip(cols, row[1:]):
            if val is not None:
                et = col[: -len("_question_id")]
                refs[row[0]] = (et, val)
                ids_by_type.setdefault(et, set()).add(val)
                break

    loaded: Dict[tuple, Any] = {}
    for et, qids in ids_by_type.items():
        model = LEGACY_EXAM_TYPE_MODELS[et]
        for q in db.query(model).filter(model.id.in_(list(qids))).all():
            loaded[(et, q.id)] = q

    for sq in pending:
        ref = refs.get(sq.id)
        sq._legacy_ref = ref
        sq._legacy_question = loaded.get(ref) if ref else None


def get_underlying_question(sq: SimuladoQuestion):
    """VestibularQuestion (simulado novo) ou a questão da tabela legada
    (simulado antigo); None se a questão de origem não existe mais."""
    if sq.vestibular_question_id is not None:
        return sq.vestibular_question
    if getattr(sq, "_legacy_question", _UNSET) is _UNSET:
        db = object_session(sq)
        if db is None:
            return None
        attach_underlying_questions(db, [sq])
    return getattr(sq, "_legacy_question", None)


def get_underlying_ref(sq: SimuladoQuestion) -> tuple:
    """(exam_type, question_id, is_unified) da questão de origem."""
    if sq.vestibular_question_id is not None:
        exam_type = sq.vq_exam_type or (sq.simulado.exam_type if sq.simulado else None)
        return exam_type, sq.vestibular_question_id, True
    get_underlying_question(sq)  # garante _legacy_ref resolvido
    ref = getattr(sq, "_legacy_ref", None)
    if ref:
        return ref[0], ref[1], False
    return None, None, False


def question_metadata(q) -> Dict[str, Any]:
    if isinstance(q, VestibularQuestion):
        meta = q.metadata_
        return meta if isinstance(meta, dict) else {}
    return {}


def question_type_of(q) -> str:
    """"summation" (UFSC, marca várias e soma) ou o tipo da questão legada;
    "single" por padrão."""
    if q is None:
        return "single"
    if isinstance(q, VestibularQuestion):
        return "summation" if question_metadata(q).get("question_type") == "summation" else "single"
    return getattr(q, "question_type", None) or "single"


def sorted_options(q) -> List[Any]:
    return sorted(q.options, key=lambda o: (getattr(o, "order", None) or 0, o.id or 0))


def _get_groq_client():
    from groq import Groq
    return Groq(api_key=settings.GROQ_API_KEY)


def _strip_thinking(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def _groq_feedback(area: str, statement: str, correct_letter: str, correct_text: str,
                   student_letter: str, student_text: str) -> str:
    """Ask GROQ for a short Portuguese explanation of why the correct answer is right."""
    prompt = (
        f"Você é um professor corrigindo uma prova de vestibular. Responda SEMPRE em português do Brasil.\n\n"
        f"Questão (área: {area}):\n"
        f"{statement}\n\n"
        f"Alternativa correta: {correct_letter}) {correct_text}\n"
        f"Alternativa escolhida pelo aluno: {student_letter}) {student_text}\n\n"
        f"Em uma frase curta, explique por que a alternativa {correct_letter} é a correta. "
        f"Responda apenas com a explicação, sem introdução ou preâmbulo."
    )
    try:
        client = _get_groq_client()
        resp = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=200,
            response_format={"type": "text"},
        )
        raw = (resp.choices[0].message.content or "").strip()
        return _strip_thinking(raw)
    except Exception as e:
        print(f"⚠️  GROQ feedback falhou: {e}")
        return ""


def _option_letter(opt) -> str:
    """Mesma lógica de app/routers/simulados.py:_serialize_option — precisa
    bater exatamente com a letra que o aluno viu na tela, senão a correção
    nunca reconhece a resposta certa pra modelos de opção sem coluna `letter`
    própria (ex.: UfscQuestionOption usa `value`, que não é a letra exibida)."""
    letter = getattr(opt, "letter", None)
    if not letter:
        order = getattr(opt, "order", None)
        letter = chr(65 + order) if isinstance(order, int) and 0 <= order < 26 else "?"
    return letter


def _grade_summation(sq: SimuladoQuestion, q) -> tuple[bool, str]:
    """Questão tipo somatório (UFSC): o aluno marca quantas afirmativas achar
    verdadeiras; a resposta é a SOMA dos valores (potências de 2) das
    marcadas, comparada ao gabarito numérico (q.answer) — nunca uma letra
    única como nas demais questões."""
    selected = {l for l in (sq.selected_letter or "").split(",") if l}
    student_sum = sum(
        (getattr(opt, "value", None) or 0) for opt in q.options if _option_letter(opt) in selected
    )
    correct_sum = _int_or_none(getattr(q, "answer", None))
    if correct_sum is None:
        correct_sum = sum(
            (getattr(opt, "value", None) or 0) for opt in q.options if getattr(opt, "is_correct", False)
        )
    is_correct = student_sum == correct_sum
    feedback = f"Soma das afirmativas marcadas: {student_sum}. Soma correta (gabarito): {correct_sum}."
    return is_correct, feedback


def _int_or_none(value) -> Optional[int]:
    # vestibular_questions.answer é TEXT ("23"); as tabelas legadas guardavam int.
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    return None


def _get_underlying_question(sq: SimuladoQuestion):
    return get_underlying_question(sq)


def _get_correct_option(sq: SimuladoQuestion):
    """Return (correct_letter, correct_text) for the question linked to this SimuladoQuestion."""
    q = _get_underlying_question(sq)
    if not q:
        return None, None

    for opt in q.options:
        if getattr(opt, "is_correct", False):
            return _option_letter(opt), getattr(opt, "text", "")

    # vestibular_questions pode trazer o gabarito só em correct_option (letra),
    # sem marcar is_correct na alternativa.
    correct = (getattr(q, "correct_option", None) or "").strip().upper()
    if correct:
        for opt in q.options:
            if _option_letter(opt).upper() == correct:
                return _option_letter(opt), getattr(opt, "text", "")
    return None, None


def _get_question_data(sq: SimuladoQuestion):
    """Return (statement, options_dict) for the underlying question."""
    q = _get_underlying_question(sq)
    if not q:
        return "", {}
        
    opts = {}
    for opt in q.options:
        opts[_option_letter(opt)] = getattr(opt, "text", "")
        
    return getattr(q, "statement", ""), opts


def correct_simulado(simulado_id: int) -> None:
    """
    Background task: correct all answers in a Simulado and optionally call GROQ
    for wrong-answer feedback (max 10 calls, 0.5s delay between each).
    """
    db: Session = SessionLocal()
    try:
        simulado: Simulado = db.get(Simulado, simulado_id)
        if not simulado:
            print(f"⚠️  correct_simulado: simulado {simulado_id} not found")
            return

        groq_available = bool(settings.GROQ_API_KEY)
        groq_calls = 0
        correct_count = 0
        total_count = 0
        area_stats: dict[str, dict[str, int]] = {}

        attach_underlying_questions(db, simulado.questions)
        for sq in simulado.questions:
            underlying_q = _get_underlying_question(sq)
            no_options = underlying_q is not None and len(underlying_q.options) == 0
            if no_options or not sq.selected_letter:
                # Sem alternativas (falha de importação) OU sem resposta
                # nenhuma — o único jeito de chegar aqui sem resposta é uma
                # questão reportada pelo aluno como problemática (o frontend
                # não exige responder essas antes de entregar). Nenhum dos
                # dois casos deve contar na nota nem no total.
                sq.is_correct = None
                continue

            total_count += 1
            area = sq.area or "Geral"
            area_stats.setdefault(area, {"correct": 0, "total": 0})
            area_stats[area]["total"] += 1

            if underlying_q is not None and question_type_of(underlying_q) == "summation":
                sq.is_correct, sq.ai_feedback = _grade_summation(sq, underlying_q)
                if sq.is_correct:
                    correct_count += 1
                    area_stats[area]["correct"] += 1
                continue

            correct_letter, correct_text = _get_correct_option(sq)

            if correct_letter is None:
                # No correct option found — skip scoring this question
                sq.is_correct = None
                continue

            student_letter = sq.selected_letter
            if student_letter is None:
                sq.is_correct = False
            else:
                sq.is_correct = student_letter.upper() == correct_letter.upper()

            if sq.is_correct:
                correct_count += 1
                area_stats[area]["correct"] += 1
            elif groq_available and groq_calls < 10 and student_letter:
                # Provide feedback for wrong answers
                statement, opts = _get_question_data(sq)
                student_text = opts.get(student_letter.upper(), "")
                feedback = _groq_feedback(area, statement, correct_letter, correct_text, student_letter, student_text)
                if feedback:
                    sq.ai_feedback = feedback
                groq_calls += 1
                if groq_calls < 10:
                    time.sleep(0.5)

        # Calculate score as percentage
        if total_count > 0:
            simulado.total_score = round(correct_count / total_count * 100, 2)
        else:
            simulado.total_score = 0.0

        breakdown = build_score_breakdown(area_stats)
        simulado.enem_estimated_score = breakdown["overall"]
        simulado.enem_score_breakdown = json.dumps(breakdown, ensure_ascii=False)

        simulado.status = "done"
        simulado.finished_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        print(f"✅  Simulado {simulado_id} corrigido: {correct_count}/{total_count} ({simulado.total_score}%)")
    except Exception as e:
        db.rollback()
        print(f"❌  Erro ao corrigir simulado {simulado_id}: {e}")
        # Sem isto, uma falha aqui deixava o simulado preso pra sempre em
        # "correcting" — nunca virava "done" nem "erro", e como só é permitido
        # 1 simulado por dia, o aluno ficava bloqueado até o dia seguinte, sem
        # nenhum jeito de tentar de novo (submit_simulado só aceita retry a
        # partir de status "error", nunca de "correcting").
        try:
            simulado = db.get(Simulado, simulado_id)
            if simulado and simulado.status == "correcting":
                simulado.status = "error"
                db.commit()
        except Exception as e2:
            db.rollback()
            print(f"❌  Também falhou ao marcar simulado {simulado_id} como 'error': {e2}")
    finally:
        db.close()
