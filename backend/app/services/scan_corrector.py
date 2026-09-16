"""AI correction of scanned paper exams using Groq vision model."""
import base64
import json
import re
from datetime import datetime
from difflib import SequenceMatcher
from typing import Optional

from app.core.config import settings
from app.models import ExamQuestion, ExamSubmission, Question, QuestionOption, QuestionType, SubmissionAnswer, SubmissionStatus, User
from app.utils.shuffle import seeded_shuffle


def _get_client():
    from groq import Groq
    return Groq(api_key=settings.GROQ_API_KEY)


def _strip_thinking(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def _call_vision(prompt: str, image_b64: str, temperature: float = 0.0) -> str:
    client = _get_client()
    resp = client.chat.completions.create(
        model=settings.GROQ_VISION_MODEL,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
            ],
        }],
        temperature=temperature,
    )
    return _strip_thinking(resp.choices[0].message.content or "")


def groq_vision_available() -> bool:
    return bool(settings.GROQ_API_KEY)


# Keep old name as alias for backward compatibility with submissions.py
ollama_vision_available = groq_vision_available


def identify_student_from_scan(
    image_bytes: bytes,
    exam_id: int,
    enrolled_students: list[User],
) -> dict:
    """
    Ask vision AI to identify the student from a scanned exam.
    Returns:
      {"student_id": int, "student_name": str, "method": "qr"|"name", "confidence": "high"|"medium"|"low"}
    or
      {"student_id": None, "student_name": str|None, "method": "unknown", "confidence": "low"}
    """
    image_b64 = base64.b64encode(image_bytes).decode()

    prompt = (
        "Esta é uma imagem de uma prova escolar digitalizada.\n"
        "Sua tarefa é identificar o aluno que respondeu esta prova. Siga esta ordem:\n\n"
        "1. Procure um QR code na imagem. "
        "Se encontrar, leia o texto exato codificado nele — deve ter o formato EXAM:<número>:STUDENT:<número>.\n"
        "2. Se não houver QR code legível, leia o nome escrito no campo 'Nome:' da prova.\n\n"
        "Retorne APENAS um JSON válido (sem texto adicional):\n"
        '{"qr_text": "<texto do QR code ou null>", '
        '"student_name": "<nome lido no campo Nome: ou null>", '
        '"confidence": "high"|"medium"|"low"}'
    )

    try:
        raw = _call_vision(prompt, image_b64)
    except Exception as e:
        return {"student_id": None, "student_name": None, "method": "unknown", "confidence": "low", "error": str(e)}

    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if not json_match:
        return {"student_id": None, "student_name": None, "method": "unknown", "confidence": "low"}

    try:
        data = json.loads(json_match.group())
    except json.JSONDecodeError:
        return {"student_id": None, "student_name": None, "method": "unknown", "confidence": "low"}

    # 1. Try QR code: expected format EXAM:{exam_id}:STUDENT:{student_id}
    qr_text = data.get("qr_text") or ""
    qr_match = re.match(r"EXAM:(\d+):STUDENT:(\d+)", qr_text.strip())
    if qr_match:
        qr_exam_id = int(qr_match.group(1))
        qr_student_id = int(qr_match.group(2))
        if qr_exam_id == exam_id:
            student = next((s for s in enrolled_students if s.id == qr_student_id), None)
            if student:
                return {
                    "student_id": student.id,
                    "student_name": student.name,
                    "method": "qr",
                    "confidence": "high",
                }

    # 2. Fallback: fuzzy-match the name read from the paper
    read_name = (data.get("student_name") or "").strip()
    if read_name:
        best_student, best_score = _fuzzy_match(read_name, enrolled_students)
        if best_student and best_score >= 0.70:
            confidence = "high" if best_score >= 0.90 else "medium"
            return {
                "student_id": best_student.id,
                "student_name": best_student.name,
                "read_name": read_name,
                "method": "name",
                "confidence": confidence,
            }
        return {
            "student_id": None,
            "student_name": None,
            "read_name": read_name,
            "method": "name_unmatched",
            "confidence": "low",
        }

    return {"student_id": None, "student_name": None, "method": "unknown", "confidence": "low"}


def _fuzzy_match(name: str, students: list[User]) -> tuple:
    name_lower = name.lower().strip()
    best, best_score = None, 0.0
    for s in students:
        score = SequenceMatcher(None, name_lower, s.name.lower()).ratio()
        if score > best_score:
            best_score = score
            best = s
    return best, best_score


def _build_prompt(exam_questions: list[ExamQuestion], student_id: int, exam_id: int) -> str:
    seed = student_id * 1_000_003 + exam_id
    shuffled_eqs = seeded_shuffle(exam_questions, seed)

    lines = [
        "Você está TRANSCREVENDO e corrigindo uma prova digitalizada.",
        "",
        "REGRAS CRÍTICAS DE TRANSCRIÇÃO — leia antes de tudo:",
        "1. Copie EXATAMENTE o que está escrito na folha, caractere por caractere.",
        "2. NUNCA complete, corrija ortografia, infira palavras ou 'melhore' o texto do aluno.",
        "3. Se um trecho for ilegível, escreva [ilegível] no lugar — NÃO adivinhe.",
        "4. Erros gramaticais, ortográficos e de concordância do aluno devem ser preservados.",
        "5. O enunciado da questão é fornecido apenas para localizar a resposta na folha, NÃO para completar o que o aluno escreveu.",
        "6. Se o aluno deixou em branco, retorne essay_text: null.",
        "",
        "QUESTÕES:",
    ]

    for i, eq in enumerate(shuffled_eqs, 1):
        q: Question = eq.question
        pts = eq.points
        lines.append(f"\nQuestão {i} [exam_question_id={eq.id}] ({pts} pts): {q.statement}")

        if q.question_type in (QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE):
            shuffled_opts = seeded_shuffle(list(q.options), seed + eq.id)
            letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            for j, opt in enumerate(shuffled_opts):
                lines.append(f"  {letters[j]}) {opt.text} [option_id={opt.id}]")
            lines.append("  → Identifique qual alternativa o aluno marcou/circulou na folha.")
        else:
            criteria = q.criteria or "Sem critérios definidos."
            lines.append(f"  Critérios de avaliação: {criteria}")
            lines.append(f"  Pontuação máxima: {pts}")
            lines.append("  → Transcreva LITERALMENTE a resposta manuscrita do aluno (veja as regras acima).")
            lines.append("  → Depois avalie a nota com base no que o aluno realmente escreveu.")

    lines += [
        "",
        "Retorne APENAS um JSON válido no seguinte formato (sem texto adicional):",
        '{',
        '  "answers": [',
        '    {',
        '      "exam_question_id": <número>,',
        '      "selected_option_id": <número ou null>,',
        '      "essay_text": "<transcrição literal do texto do aluno, ou null se em branco>",',
        '      "score": <número ou null se não conseguir identificar>,',
        '      "feedback": "<comentário breve sobre a resposta>"',
        '    }',
        '  ]',
        '}',
        "",
        "Para questões objetivas: selected_option_id deve ser o id da alternativa marcada, essay_text = null.",
        "Para questões dissertativas: selected_option_id = null, essay_text = transcrição literal.",
        "Se não conseguir identificar a resposta objetiva, retorne selected_option_id: null e score: null.",
        "Se não conseguir ler nenhum trecho da resposta dissertativa, retorne essay_text: null e score: null.",
    ]

    return "\n".join(lines)


def correct_from_scan(submission: ExamSubmission, image_bytes: bytes, db) -> None:
    """Process a scanned exam image and populate SubmissionAnswer records."""
    from app.services import usage as usage_service
    from app.models import UsageEventType

    exam = submission.exam
    exam_questions = list(exam.exam_questions)
    student_id = submission.student_id
    exam_id = exam.id

    # Feature gate: plano Basic não inclui correção por IA
    professor = db.get(User, exam.professor_id)
    if not professor or not usage_service.ai_enabled(db, professor.institution_id):
        _mark_manual_review(
            db, submission,
            "Correção por IA indisponível no plano atual. Revisão manual necessária.",
        )
        return

    prompt = _build_prompt(exam_questions, student_id, exam_id)
    image_b64 = base64.b64encode(image_bytes).decode()

    try:
        raw = _call_vision(prompt, image_b64)
    except Exception as e:
        _mark_manual_review(db, submission, f"Erro ao chamar IA de visão: {e}")
        return

    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if not json_match:
        _mark_manual_review(db, submission, "IA não retornou JSON válido. Revisão manual necessária.")
        return

    try:
        data = json.loads(json_match.group())
        ai_answers = data.get("answers", [])
    except json.JSONDecodeError:
        _mark_manual_review(db, submission, "Erro ao parsear resposta da IA. Revisão manual necessária.")
        return

    ai_map = {a["exam_question_id"]: a for a in ai_answers if "exam_question_id" in a}

    for existing in submission.answers:
        db.delete(existing)
    db.flush()

    total = 0.0
    all_scored = True
    essays_corrected = 0

    for eq in exam_questions:
        ai = ai_map.get(eq.id, {})
        score = ai.get("score")
        feedback = ai.get("feedback", "")
        selected_option_id = ai.get("selected_option_id")
        essay_text = ai.get("essay_text")

        q: Question = eq.question

        if q.question_type == QuestionType.ESSAY and score is not None:
            essays_corrected += 1

        if selected_option_id is not None:
            valid_option_ids = {opt.id for opt in q.options}
            if selected_option_id not in valid_option_ids:
                selected_option_id = None

        if q.question_type in (QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE):
            if selected_option_id is not None and score is None:
                opt = db.get(QuestionOption, selected_option_id)
                score = eq.points if (opt and opt.is_correct) else 0.0

        if score is None:
            all_scored = False
        else:
            total += float(score)

        answer = SubmissionAnswer(
            submission_id=submission.id,
            exam_question_id=eq.id,
            selected_option_id=selected_option_id,
            essay_text=essay_text,
            score=float(score) if score is not None else None,
            ai_feedback=feedback or None,
            is_auto_corrected=True,
        )
        db.add(answer)

    submission.status = SubmissionStatus.DONE if all_scored else SubmissionStatus.CORRECTING
    submission.total_score = round(total, 2) if all_scored else None
    if all_scored:
        submission.correcting_since = None
    db.commit()

    # Contabiliza uso de correção por IA (uma por discursiva efetivamente corrigida)
    if essays_corrected > 0:
        usage_service.record_usage(
            db, professor, UsageEventType.AI_CORRECTION.value, quantity=essays_corrected
        )


def _mark_manual_review(db, submission: ExamSubmission, message: str) -> None:
    for existing in submission.answers:
        db.delete(existing)
    db.flush()

    for eq in submission.exam.exam_questions:
        db.add(SubmissionAnswer(
            submission_id=submission.id,
            exam_question_id=eq.id,
            ai_feedback=message,
            is_auto_corrected=False,
        ))

    submission.status = SubmissionStatus.CORRECTING
    submission.correcting_since = datetime.utcnow()
    submission.total_score = None
    db.commit()
