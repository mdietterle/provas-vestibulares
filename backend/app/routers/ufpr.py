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
    Subject,
    UfprQuestion,
    UfprQuestionOption,
    User,
    VestibularQuestion,
)

from app.schemas import QuestionOut, UfprImportRequest, UfprQuestionOut

router = APIRouter(prefix="/ufpr-questions", tags=["ufpr"])


@router.post("/admin/run-seed", status_code=200)
def run_ufpr_seed(
    background_tasks: BackgroundTasks,
_: User = Depends(require_owner)):
    """Owner-only: cria as tabelas UFPR e importa as questões da coletânea local."""
    from app.services.ufpr.seed import seed_ufpr
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(run_import_with_timeout, seed_ufpr, task_id=task_id)
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro no seed: {e}")


@router.post("/admin/import-all", status_code=200)
def import_all_ufpr(
    background_tasks: BackgroundTasks,
    since_year: Optional[int] = Query(None, description="Se informado, importa só a partir desse ano (padrão: 2009)"),
    until_year: Optional[int] = Query(None, description="Se informado, importa só até esse ano (padrão: 2026)"),
    _: User = Depends(require_owner),
):
    """Owner-only: varre o site oficial do NC-UFPR (não a coletânea local) e
    importa a prova de cada ano, um PDF por ano. A resposta correta vem de
    um marcador no próprio texto da prova ("*" ou "►" antes da alternativa
    certa) — não precisa de OCR. Validado contra 2010-2020 e 2022-2026 (taxa
    de acerto do gabarito de 100% em todos).

    Exceções conhecidas: 2021 (aplicação fora do padrão, com PDFs separados
    por idioma em vez de um "Geral" único) não é suportada; 2009 usa um
    formato de alternativas sem letra ("Resposta correta: <texto>" no fim de
    cada questão) que este scraper não reconhece; 2022 foi uma edição de
    "Fase Única" cujo conteúdo é só Língua Estrangeira (não o "Conhecimentos
    Gerais" completo das demais edições) — importa normalmente, só com menos
    questões. Anos sem URL reconhecida são pulados e reportados, sem travar
    o lote."""
    from app.services.ufpr.pdf_import import import_all_ufpr_exams
    try:
        from app.services.progress import create_task, run_import_with_timeout
        task_id = create_task()
        background_tasks.add_task(
            run_import_with_timeout, import_all_ufpr_exams, since_year=since_year or 2009, until_year=until_year, task_id=task_id
        )
        return {"ok": True, "task_id": task_id}
    except Exception as e:
        raise HTTPException(500, f"Erro ao importar provas: {e}")


@router.get("", response_model=List[UfprQuestionOut])
def list_ufpr_questions(
    year: Optional[int] = Query(None),
    area: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(UfprQuestion)
    if year:
        q = q.filter(UfprQuestion.year == year)
    if area:
        q = q.filter(UfprQuestion.area.ilike(f"%{area}%"))
    if search:
        q = q.filter(UfprQuestion.statement.ilike(f"%{search}%"))
    return (
        q.order_by(UfprQuestion.year.desc(), UfprQuestion.number)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/years", response_model=List[int])
def list_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(UfprQuestion.year).distinct().order_by(UfprQuestion.year.desc()).all()
    return [r[0] for r in rows]


@router.get("/areas", response_model=List[str])
def list_areas(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(UfprQuestion.area)
        .distinct()
        .filter(UfprQuestion.area.isnot(None))
        .order_by(UfprQuestion.area)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{question_id}", response_model=UfprQuestionOut)
def get_ufpr_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.get(UfprQuestion, question_id)
    if not q:
        raise HTTPException(404, "Questão não encontrada")
    return q


@router.post("/import", response_model=QuestionOut, status_code=201)
def import_ufpr_question(
    payload: UfprImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Copia uma questão UFPR para o banco de questões da escola do professor."""
    ufpr_q = db.get(UfprQuestion, payload.ufpr_question_id)
    if not ufpr_q:
        raise HTTPException(404, "Questão UFPR não encontrada")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")

    statement = f"{ufpr_q.statement}\n\n[UFPR {ufpr_q.year} – Q{ufpr_q.number}]"

    # Carrega a primeira imagem (o banco do professor tem um único campo de imagem).
    images = sorted(ufpr_q.images, key=lambda i: i.order)
    image_base64 = images[0].image_base64 if images else ufpr_q.image_base64

    question = Question(
        statement=statement,
        question_type=QuestionType.MULTIPLE_CHOICE,
        is_public=payload.is_public,
        difficulty=payload.difficulty,
        image_base64=image_base64,
        subject_id=payload.subject_id,
        professor_id=current_user.id,
    )
    db.add(question)
    db.flush()

    for opt in sorted(ufpr_q.options, key=lambda o: o.order):
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
