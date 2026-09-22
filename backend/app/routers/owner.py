from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.database import get_db
from app.deps import require_owner
from app.models import Institution, User, UserRole
from app.services.billing import plan_price
from app.services.subjects import seed_default_subjects

router = APIRouter(prefix="/api/owner", tags=["owner"])


class SchoolCreate(BaseModel):
    name: str
    cnpj: Optional[str] = None
    admin_name: str
    admin_email: EmailStr
    admin_password: str


@router.post("/institutions", status_code=201)
def create_school(
    payload: SchoolCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    if len(payload.admin_password) < 6:
        raise HTTPException(status_code=422, detail="A senha deve ter no mínimo 6 caracteres")
    if db.query(User).filter(func.lower(User.email) == payload.admin_email.strip().lower()).first():
        raise HTTPException(status_code=400, detail="Já existe uma conta com este e-mail")
    if payload.cnpj and db.query(Institution).filter(Institution.cnpj == payload.cnpj).first():
        raise HTTPException(status_code=400, detail="Já existe uma instituição com este CNPJ")

    institution = Institution(name=payload.name.strip(), cnpj=payload.cnpj or None)
    db.add(institution)
    db.flush()
    seed_default_subjects(db, institution.id)

    admin = User(
        name=payload.admin_name.strip(),
        email=payload.admin_email,
        hashed_password=get_password_hash(payload.admin_password),
        role=UserRole.ADMIN,
        institution_id=institution.id,
    )
    db.add(admin)
    db.commit()
    db.refresh(institution)

    return {
        "id": institution.id,
        "name": institution.name,
        "cnpj": institution.cnpj,
        "is_active": institution.is_active,
        "admin_email": admin.email,
    }


@router.patch("/institutions/{institution_id}/active")
def set_institution_active(
    institution_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    institution = db.get(Institution, institution_id)
    if not institution:
        raise HTTPException(status_code=404, detail="Instituição não encontrada")
    institution.is_active = is_active
    db.commit()
    return {"ok": True, "is_active": institution.is_active}


@router.delete("/institutions/{institution_id}")
def delete_school(
    institution_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    institution = db.get(Institution, institution_id)
    if not institution:
        raise HTTPException(status_code=404, detail="Instituição não encontrada")
    user_count = db.query(User).filter(User.institution_id == institution_id).count()
    if user_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Não é possível excluir: a instituição ainda tem {user_count} usuário(s). "
            "Remova todos os usuários primeiro, ou apenas inative a instituição.",
        )
    db.delete(institution)
    db.commit()
    return {"ok": True}


# ── Usuários (todas as instituições) ─────────────────────────────────────────
#
# Diferente de app/routers/users.py (sempre restrito a
# current_user.institution_id), estes endpoints deixam o owner ver e agir
# sobre qualquer usuário de qualquer escola — não existia nenhum jeito de
# fazer isso antes (o owner só via contagens agregadas por instituição em
# GET /institutions).

class OwnerUserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    deleted_at: Optional[datetime] = None
    institution_id: int
    institution_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class OwnerUserRoleUpdate(BaseModel):
    role: UserRole


@router.get("/users", response_model=list[OwnerUserOut])
def list_all_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    institution_id: Optional[int] = None,
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    query = (
        db.query(User, Institution.name.label("institution_name"))
        .join(Institution, Institution.id == User.institution_id)
        .filter(User.role != UserRole.OWNER)
    )
    if not include_deleted:
        query = query.filter(User.deleted_at.is_(None))
    if role:
        query = query.filter(User.role == role)
    if institution_id:
        query = query.filter(User.institution_id == institution_id)
    if search:
        like = f"%{search.strip()}%"
        query = query.filter((User.name.ilike(like)) | (User.email.ilike(like)))

    rows = query.order_by(User.created_at.desc()).all()
    return [
        OwnerUserOut(
            id=u.id, name=u.name, email=u.email, role=u.role, is_active=u.is_active,
            deleted_at=u.deleted_at, institution_id=u.institution_id,
            institution_name=inst_name, created_at=u.created_at,
        )
        for u, inst_name in rows
    ]


@router.patch("/users/{user_id}/active", response_model=OwnerUserOut)
def owner_toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    user = db.get(User, user_id)
    if not user or user.role == UserRole.OWNER:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.deleted_at:
        raise HTTPException(status_code=400, detail="Usuário já foi excluído — não pode ser reativado por aqui")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return OwnerUserOut(
        id=user.id, name=user.name, email=user.email, role=user.role, is_active=user.is_active,
        deleted_at=user.deleted_at, institution_id=user.institution_id,
        institution_name=user.institution.name if user.institution else user.pending_institution_name,
        created_at=user.created_at,
    )


@router.patch("/users/{user_id}/role", response_model=OwnerUserOut)
def owner_change_user_role(
    user_id: int,
    payload: OwnerUserRoleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    user = db.get(User, user_id)
    if not user or user.role == UserRole.OWNER:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if payload.role == UserRole.OWNER:
        raise HTTPException(status_code=400, detail="Não é possível promover a proprietário por aqui")
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return OwnerUserOut(
        id=user.id, name=user.name, email=user.email, role=user.role, is_active=user.is_active,
        deleted_at=user.deleted_at, institution_id=user.institution_id,
        institution_name=user.institution.name if user.institution else user.pending_institution_name,
        created_at=user.created_at,
    )


@router.delete("/users/{user_id}", status_code=204)
def owner_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    """Soft-delete, igual ao endpoint de instituição — mesmo comportamento de
    app/routers/users.py:delete_user, só que sem a trava de institution_id."""
    user = db.get(User, user_id)
    if not user or user.role == UserRole.OWNER:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.deleted_at:
        raise HTTPException(status_code=400, detail="Usuário já foi excluído")
    user.deleted_at = datetime.utcnow()
    user.is_active = False
    db.commit()


@router.get("/metrics")
def get_metrics(
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    now = datetime.utcnow()
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first_of_prev = (first_of_month - timedelta(days=1)).replace(day=1)

    # Institutions count total and new this month
    inst_total = db.execute(text("SELECT COUNT(*) FROM institutions")).scalar()
    inst_new_month = db.execute(
        text("SELECT COUNT(*) FROM institutions WHERE created_at >= :start"),
        {"start": first_of_month},
    ).scalar()

    # Users
    users_total = db.execute(
        text("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND LOWER(role::text) != 'owner'")
    ).scalar()
    users_new_month = db.execute(
        text("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND LOWER(role::text) != 'owner' AND created_at >= :start"),
        {"start": first_of_month},
    ).scalar()

    # Professors
    prof_total = db.execute(
        text("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND LOWER(role::text) = 'professor'")
    ).scalar()

    # Exams this month
    exams_month = db.execute(
        text("SELECT COUNT(*) FROM exams WHERE created_at >= :start"),
        {"start": first_of_month},
    ).scalar()

    # Submissions this month (column is submitted_at, not created_at)
    submissions_month = db.execute(
        text("SELECT COUNT(*) FROM exam_submissions WHERE submitted_at >= :start"),
        {"start": first_of_month},
    ).scalar()

    # AI usage this month (cost monitoring)
    ai_generation_month = db.execute(
        text("SELECT COALESCE(SUM(quantity), 0) FROM usage_events WHERE event_type = 'ai_generation' AND created_at >= :start"),
        {"start": first_of_month},
    ).scalar()
    ai_correction_month = db.execute(
        text("SELECT COALESCE(SUM(quantity), 0) FROM usage_events WHERE event_type = 'ai_correction' AND created_at >= :start"),
        {"start": first_of_month},
    ).scalar()
    ai_overage_month = db.execute(
        text("SELECT COALESCE(SUM(quantity), 0) FROM usage_events WHERE is_overage = TRUE AND created_at >= :start"),
        {"start": first_of_month},
    ).scalar()

    # Active institutions (has at least one exam in last 30 days)
    active_inst = db.execute(
        text("""
            SELECT COUNT(DISTINCT i.id) FROM institutions i
            JOIN users u ON u.institution_id = i.id
            JOIN exams e ON e.professor_id = u.id
            WHERE e.created_at >= :since
        """),
        {"since": now - timedelta(days=30)},
    ).scalar()

    # MRR — simulado a partir da contagem real de instituições por plano ×
    # preço mensal (não há assinatura Stripe obrigatória para toda
    # instituição ainda, só o checkout está implementado). Preço vem de
    # app/services/billing.py — fonte única, espelha os Price reais da Stripe.
    plan_rows = db.execute(
        text("""
            SELECT COALESCE(LOWER(plan_type), 'basic') AS plan, COUNT(*) AS cnt
            FROM institutions
            GROUP BY plan
        """)
    ).fetchall()
    mrr = sum(plan_price(r.plan) * r.cnt for r in plan_rows)

    def _mrr_before(cutoff: datetime) -> int:
        rows = db.execute(
            text("""
                SELECT COALESCE(LOWER(plan_type), 'basic') AS plan, COUNT(*) AS cnt
                FROM institutions
                WHERE created_at < :cutoff
                GROUP BY plan
            """),
            {"cutoff": cutoff},
        ).fetchall()
        return sum(plan_price(r.plan) * r.cnt for r in rows)

    mrr_prev = _mrr_before(first_of_month)
    mrr_growth = round(((mrr - mrr_prev) / mrr_prev * 100) if mrr_prev > 0 else 0, 1)

    # Tendência real de 3 meses (não é previsão de IA — é a variação média
    # mensal observada no MRR simulado nos últimos 3 meses). Substituiu o
    # "AI Forecast" que multiplicava mrr_growth por um fator arbitrário
    # (1.05) sem nenhum modelo por trás.
    mrr_3m_ago = _mrr_before(first_of_month - timedelta(days=90))
    mrr_growth_trend_3m = round((((mrr - mrr_3m_ago) / mrr_3m_ago * 100) / 3) if mrr_3m_ago > 0 else mrr_growth, 1)

    # Tempo médio de permanência (meses desde o cadastro) das instituições
    # ativas — usado no card de LTV no lugar de um número de retenção
    # inventado. Não é uma medida de churn real (não há histórico de
    # cancelamento), só a idade média das contas hoje ativas.
    avg_tenure_months = db.execute(
        text("""
            SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 2592000), 0)
            FROM institutions
            WHERE COALESCE(is_active, TRUE)
        """)
    ).scalar()
    avg_tenure_months = round(float(avg_tenure_months or 0), 1)

    # Churn: institutions inactive (no exams) last 30 days / total prev month
    inactive = db.execute(
        text("""
            SELECT COUNT(DISTINCT i.id) FROM institutions i
            WHERE i.created_at < :since
            AND NOT EXISTS (
                SELECT 1 FROM users u
                JOIN exams e ON e.professor_id = u.id
                WHERE u.institution_id = i.id AND e.created_at >= :since
            )
        """),
        {"since": now - timedelta(days=30)},
    ).scalar()
    churn_rate = round((inactive / inst_total * 100) if inst_total > 0 else 0, 1)
    retention_rate = round(100 - churn_rate, 1)

    return {
        "mrr": mrr,
        "mrr_prev": mrr_prev,
        "mrr_growth": mrr_growth,
        "mrr_growth_trend_3m": mrr_growth_trend_3m,
        "avg_tenure_months": avg_tenure_months,
        "churn_rate": churn_rate,
        "retention_rate": retention_rate,
        "institutions_total": inst_total,
        "institutions_new_month": inst_new_month,
        "institutions_active": active_inst,
        "users_total": users_total,
        "users_new_month": users_new_month,
        "professors_total": prof_total,
        "exams_month": exams_month,
        "submissions_month": submissions_month,
        "ai_generation_month": ai_generation_month,
        "ai_correction_month": ai_correction_month,
        "ai_overage_month": ai_overage_month,
    }


@router.get("/institutions")
def get_institutions(
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    rows = db.execute(
        text("""
            SELECT
                i.id,
                i.name,
                i.cnpj,
                COALESCE(i.plan_type, 'basic') AS plan_type,
                COALESCE(i.car_enabled, FALSE) AS car_enabled,
                COALESCE(i.is_active, TRUE) AS is_active,
                i.plan_since,
                i.created_at,
                COUNT(DISTINCT u.id) FILTER (WHERE LOWER(u.role::text) = 'professor' AND u.deleted_at IS NULL) AS professors,
                COUNT(DISTINCT u.id) FILTER (WHERE LOWER(u.role::text) = 'student' AND u.deleted_at IS NULL) AS students,
                COUNT(DISTINCT e.id) AS exams_total,
                MAX(e.created_at) AS last_exam_at,
                (SELECT COALESCE(SUM(ue.quantity), 0) FROM usage_events ue
                    WHERE ue.institution_id = i.id AND ue.event_type = 'ai_generation'
                    AND ue.created_at >= DATE_TRUNC('month', NOW())) AS ai_generation_month,
                (SELECT COALESCE(SUM(ue.quantity), 0) FROM usage_events ue
                    WHERE ue.institution_id = i.id AND ue.event_type = 'ai_correction'
                    AND ue.created_at >= DATE_TRUNC('month', NOW())) AS ai_correction_month
            FROM institutions i
            LEFT JOIN users u ON u.institution_id = i.id
            LEFT JOIN exams e ON e.professor_id = u.id
            GROUP BY i.id
            ORDER BY i.created_at DESC
        """)
    ).fetchall()

    return [
        {
            "id": r.id,
            "name": r.name,
            "cnpj": r.cnpj,
            "plan_type": r.plan_type,
            "plan_since": r.plan_since.isoformat() if r.plan_since else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "professors": r.professors,
            "students": r.students,
            "exams_total": r.exams_total,
            "ai_generation_month": r.ai_generation_month,
            "ai_correction_month": r.ai_correction_month,
            "last_exam_at": r.last_exam_at.isoformat() if r.last_exam_at else None,
            "mrr": plan_price(r.plan_type),
            "status": "ativo" if r.last_exam_at and (datetime.utcnow() - r.last_exam_at).days <= 30 else "inativo",
            "car_enabled": bool(r.car_enabled),
            "is_active": bool(r.is_active),
        }
        for r in rows
    ]


@router.patch("/institutions/{institution_id}/plan")
def update_plan(
    institution_id: int,
    plan_type: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    valid_plans = {"basic", "pro", "enterprise"}
    if plan_type not in valid_plans:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Plano inválido. Use: {valid_plans}")
    db.execute(
        text("UPDATE institutions SET plan_type = :plan, plan_since = NOW() WHERE id = :id"),
        {"plan": plan_type, "id": institution_id},
    )
    db.commit()
    return {"ok": True, "mrr": plan_price(plan_type)}


@router.patch("/institutions/{institution_id}/modules")
def update_modules(
    institution_id: int,
    car_enabled: bool,
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    db.execute(
        text("UPDATE institutions SET car_enabled = :car WHERE id = :id"),
        {"car": car_enabled, "id": institution_id},
    )
    db.commit()
    return {"ok": True, "car_enabled": car_enabled}


@router.get("/growth")
def get_growth(
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    """Monthly growth data for the last 6 months."""
    rows = db.execute(
        text("""
            SELECT
                TO_CHAR(DATE_TRUNC('month', created_at), 'Mon/YY') AS month,
                DATE_TRUNC('month', created_at) AS month_date,
                COUNT(*) AS new_institutions
            FROM institutions
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY month_date
            ORDER BY month_date
        """)
    ).fetchall()

    users_rows = db.execute(
        text("""
            SELECT
                DATE_TRUNC('month', created_at) AS month_date,
                COUNT(*) AS new_users
            FROM users
            WHERE deleted_at IS NULL
              AND LOWER(role::text) != 'owner'
              AND created_at >= NOW() - INTERVAL '6 months'
            GROUP BY month_date
            ORDER BY month_date
        """)
    ).fetchall()

    users_map = {r.month_date: r.new_users for r in users_rows}

    return [
        {
            "month": r.month,
            "new_institutions": r.new_institutions,
            "new_users": users_map.get(r.month_date, 0),
        }
        for r in rows
    ]


@router.get("/tasks/{task_id}")
def get_task(
    task_id: str,
    _: User = Depends(require_owner),
):
    from app.services.progress import get_task_status
    from fastapi import HTTPException
    
    status = get_task_status(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
    return status


@router.delete("/questions/{university}")
def delete_questions(
    university: str,
    year: Optional[int] = None,
    since_year: Optional[int] = None,
    until_year: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    from fastapi import HTTPException
    from app.models import Base
    from sqlalchemy import select
    
    # Prefix tables
    q_table = Base.metadata.tables.get(f"{university}_questions")
    if q_table is None:
        raise HTTPException(status_code=404, detail=f"Universidade não encontrada ou sem tabela de questões ({university}_questions)")

    opt_table = Base.metadata.tables.get(f"{university}_question_options")
    img_table = Base.metadata.tables.get(f"{university}_question_images")
    simulado_table = Base.metadata.tables.get("simulado_questions")
    
    # Find IDs
    query = select(q_table.c.id)
    if year:
        query = query.where(q_table.c.year == year)
    if since_year:
        query = query.where(q_table.c.year >= since_year)
    if until_year:
        query = query.where(q_table.c.year <= until_year)
        
    ids = db.execute(query).scalars().all()
    if not ids:
        return {"deleted": 0, "message": "Nenhuma questão encontrada para os critérios informados"}
        
    # Unlink from simulados to avoid FK violation
    if simulado_table is not None and f"{university}_question_id" in simulado_table.c:
        fk_col = simulado_table.c[f"{university}_question_id"]
        db.execute(
            simulado_table.update().where(fk_col.in_(ids)).values({fk_col.name: None})
        )
        
    # Delete dependents
    if img_table is not None:
        db.execute(img_table.delete().where(img_table.c.question_id.in_(ids)))
        
    if opt_table is not None:
        db.execute(opt_table.delete().where(opt_table.c.question_id.in_(ids)))
        
    # Delete main
    db.execute(q_table.delete().where(q_table.c.id.in_(ids)))
    
    db.commit()
    return {"deleted": len(ids), "message": f"{len(ids)} questões removidas com sucesso"}

@router.get("/stats/detailed")
def get_detailed_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_owner),
):
    from app.models import Base, Simulado, User, Institution, Subject
    from sqlalchemy import func, select

    # 1. Question Stats
    question_mappers = [
        m for m in Base.registry.mappers 
        if m.class_.__name__.endswith('Question') 
        and m.class_.__name__ not in ('Question', 'SimuladoQuestion', 'ExamQuestion')
    ]
    
    question_stats = []
    
    for mapper in question_mappers:
        cls = mapper.class_
        if not hasattr(cls, 'year'):
            continue

        university = cls.__name__.replace('Question', '')
        has_area = hasattr(cls, 'area')
        has_subject_id = hasattr(cls, 'subject_id')

        try:
            if has_area:
                query = select(cls.year, cls.area, func.count(cls.id)).group_by(cls.year, cls.area)
                rows = db.execute(query).all()
                for year, area, count in rows:
                    question_stats.append({
                        "university": university,
                        "year": year,
                        "subject": area or "N/A",
                        "count": count
                    })
            elif has_subject_id:
                query = select(cls.year, Subject.name, func.count(cls.id)).join(Subject, cls.subject_id == Subject.id).group_by(cls.year, Subject.name)
                rows = db.execute(query).all()
                for year, subj_name, count in rows:
                    question_stats.append({
                        "university": university,
                        "year": year,
                        "subject": subj_name or "N/A",
                        "count": count
                    })
            else:
                query = select(cls.year, func.count(cls.id)).group_by(cls.year)
                rows = db.execute(query).all()
                for year, count in rows:
                    question_stats.append({
                        "university": university,
                        "year": year,
                        "subject": "N/A",
                        "count": count
                    })
        except Exception:
            # Um modelo com coluna nova sem migração aplicada (ex.: coluna
            # existe na classe mas não na tabela real) não pode derrubar a
            # página de estatísticas inteira — melhor pular essa universidade
            # e seguir com as demais do que dar 500 em tudo.
            db.rollback()
            continue

    # 2. Simulados por etapa
    simulados_stages = db.execute(select(Simulado.status, func.count(Simulado.id)).group_by(Simulado.status)).all()
    stage_stats = [{"status": s, "count": c} for s, c in simulados_stages]
    
    # 3. Médias por escola
    school_avgs_rows = db.execute(
        select(Institution.name, func.avg(Simulado.total_score).label("avg_score"))
        .select_from(Simulado)
        .join(User, Simulado.student_id == User.id)
        .join(Institution, User.institution_id == Institution.id)
        .where(Simulado.status == 'done')
        .group_by(Institution.name)
    ).all()
    school_avgs = [{"school": name, "average": float(avg) if avg else 0.0} for name, avg in school_avgs_rows]
    
    # 4. Médias por Universidade (exam_type)
    # ENEM usa enem_estimated_score se disponível, caso contrário total_score. Vamos separar pelo exam_type.
    uni_avgs_rows = db.execute(
        select(Simulado.exam_type, func.avg(Simulado.total_score).label("avg_score"), func.avg(Simulado.enem_estimated_score).label("avg_enem_score"))
        .where(Simulado.status == 'done')
        .group_by(Simulado.exam_type)
    ).all()
    
    uni_avgs = []
    for exam_type, avg_score, avg_enem in uni_avgs_rows:
        if exam_type.lower() == 'enem':
            uni_avgs.append({"university": "ENEM", "average": float(avg_enem) if avg_enem is not None else (float(avg_score) if avg_score is not None else 0.0)})
        else:
            uni_avgs.append({"university": exam_type.upper(), "average": float(avg_score) if avg_score is not None else 0.0})

    return {
        "questions": question_stats,
        "simulados_stages": stage_stats,
        "school_averages": school_avgs,
        "university_averages": uni_avgs
    }
