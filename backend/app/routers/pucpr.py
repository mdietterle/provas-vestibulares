import uuid
from typing import List, Optional

from fastapi import BackgroundTasks, APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_owner, require_professor
from app.models import (
    Question,
    QuestionOption,
    QuestionType,
    PucprQuestion,
    PucprQuestionOption,
    Subject,
    User,
)
from app.schemas import PucprImportRequest, PucprQuestionOut, PucprUrlImportRequest, QuestionOut

router = APIRouter(prefix="/pucpr-questions", tags=["pucpr"])


@router.post("/admin/import-url", status_code=200)
def import_pucpr_url(
    payload: PucprUrlImportRequest,
    _: User = Depends(require_owner),
):
    """Owner-only: baixa o PDF de uma prova PUCPR a partir de uma URL pública
    (os links "[GABARITO DEFINITIVO]" em pucpr.br/vestibular/editais/ são, na
    verdade, o caderno de prova completo) e extrai as questões. A resposta
    correta é detectada automaticamente pelo grifo/destaque colorido que a
    própria prova traz na alternativa certa — `gabarito_text` é opcional,
    usado só como reforço manual se o grifo não for reconhecido em alguma
    questão. Para importar todas as provas do site de uma vez, use
    /admin/import-all."""
    from app.services.pucpr.pdf_import import import_pucpr_exam
    try:
        result = import_pucpr_exam(
            prova_url=payload.url,
            prova_path=None,
            gabarito_text=payload.gabarito_text,
            year=payload.year,
            season=payload.season,
            course=payload.course,
            color=payload.color,
        )
        return {"ok": True, **result}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar PDF: {e}")


@router.post("/admin/import-all", status_code=200)
def import_all_pucpr(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só provas desse ano em diante"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só provas até esse ano"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre https://www.pucpr.br/vestibular/editais/, encontra
    TODOS os links de gabarito (dezenas, de vários anos) e importa cada
    prova, uma a uma. A resposta correta é detectada pelo grifo colorido
    (provas 2022/2+) ou pela ausência do marcador "X" (provas 2020-2022/1).
    Falha ou 0 questões numa edição não interrompe as demais. `since_year`/
    `until_year` restringem o intervalo de anos. Pode demorar vários minutos
    (dezenas de PDFs baixados e processados em sequência) — aumente o
    timeout do cliente."""
    from app.services.pucpr.pdf_import import import_all_pucpr_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(
            run_import_with_timeout,
            import_all_pucpr_exams,
            since_year=since_year,
            until_year=until_year,
            task_id=task_id,
        )
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar provas: {e}")


@router.get("", response_model=List[PucprQuestionOut])
def list_pucpr_questions(
    year: Optional[int] = Query(None),
    season: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(PucprQuestion)
    if year:
        q = q.filter(PucprQuestion.year == year)
    if season:
        q = q.filter(PucprQuestion.season == season)
    if course:
        q = q.filter(PucprQuestion.course == course)
    if area:
        q = q.filter(PucprQuestion.area.ilike(f"%{area}%"))
    if search:
        q = q.filter(PucprQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(PucprQuestion.year.desc(), PucprQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(PucprQuestion.year).distinct().order_by(PucprQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(PucprQuestion.area)
        .distinct()
        .filter(PucprQuestion.area.isnot(None))
        .order_by(PucprQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=PucprQuestionOut)
def get_pucpr_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(PucprQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_pucpr_question(
    payload: PucprImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão PUCPR para o banco de questões da escola do professor."""
    pucpr_q = db.get(PucprQuestion, payload.pucpr_question_id)
    if not pucpr_q:
        raise HTTPException(404, "Questão PUCPR não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    statement = f"{pucpr_q.statement}\n\n[{pucpr_q.exam_name} – Q{pucpr_q.number}]"

    question = Question(
        statement=statement,
        question_type=QuestionType.MULTIPLE_CHOICE,
        is_public=payload.is_public,
        difficulty=payload.difficulty,
        image_base64=pucpr_q.image_base64,
        subject_id=payload.subject_id,
        professor_id=current_user.id,
    )
    db.add(question)
    db.flush()

    for opt in sorted(pucpr_q.options, key=lambda o: o.order):
        db.add(
            QuestionOption(
                question_id=question.id,
                text=opt.text,
                is_correct=opt.is_correct,
                order=opt.order,
            )
        )

    db.commit()
    db.refresh(question)
    return question
