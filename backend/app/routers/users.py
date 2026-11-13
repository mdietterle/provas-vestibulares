from pydantic import BaseModel
import secrets
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Class, StudentClass, TeachingAssignment, User, UserRole
from app.schemas import TeachingAssignmentOut, UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserOut])
def list_users(
    role: Optional[UserRole] = Query(None),
    include_deleted: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(User).filter(User.institution_id == current_user.institution_id)
    if role:
        q = q.filter(User.role == role)
    if not include_deleted:
        q = q.filter(User.deleted_at.is_(None))
    users = q.all()
    
    # For students, fetch class names in bulk to avoid N+1 queries
    if role == UserRole.STUDENT and users:
        user_ids = [u.id for u in users]
        enrollments = (
            db.query(StudentClass.student_id, Class.name, Class.year)
            .join(Class, StudentClass.class_id == Class.id)
            .filter(StudentClass.student_id.in_(user_ids))
            .all()
        )
        class_map: dict[int, list[str]] = {}
        for student_id, class_name, class_year in enrollments:
            label = f"{class_name} · {class_year}" if class_year else class_name
            class_map.setdefault(student_id, []).append(label)
        return [UserOut.from_user(u, class_names=class_map.get(u.id, [])) for u in users]
    
    return [UserOut.from_user(u) for u in users]


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if payload.institution_id != current_user.institution_id:
        raise HTTPException(403, "Só pode criar usuários na sua instituição")
    if db.query(User).filter(func.lower(User.email) == payload.email.strip().lower()).first():
        raise HTTPException(400, "Email já cadastrado")
    if payload.role == UserRole.PROFESSOR:
        from app.services import usage as usage_service
        if not usage_service.can_add_professor(db, current_user.institution_id):
            raise HTTPException(
                403,
                "Limite de professores do plano atingido. "
                "Faça upgrade do plano para cadastrar mais professores.",
            )

    data = payload.model_dump()
    password = data.pop("password", None)

    send_invite = False
    if payload.role == UserRole.STUDENT and not password:
        # Admin não informou senha: aluno é criado sem senha e recebe convite por
        # e-mail pra definir a dele própria (única situação em que o e-mail ainda
        # é necessário — sem ele o aluno não teria como entrar de jeito nenhum).
        token = secrets.token_urlsafe(32)
        data["hashed_password"] = get_password_hash(secrets.token_urlsafe(16))  # senha aleatória temporária
        data["invitation_token"] = token
        data["invitation_sent_at"] = datetime.utcnow()
        data["is_active"] = True
        send_invite = True
    elif payload.role == UserRole.STUDENT:
        # Admin já definiu a senha do aluno na hora do cadastro: login liberado
        # de imediato, sem depender de e-mail nenhum.
        data["hashed_password"] = get_password_hash(password)
        data["invitation_accepted_at"] = datetime.utcnow()
    elif payload.role == UserRole.PROFESSOR and not password:
        # Professor criado sem senha: recebe convite por e-mail pra definir a dele própria.
        token = secrets.token_urlsafe(32)
        data["hashed_password"] = get_password_hash(secrets.token_urlsafe(16))
        data["invitation_token"] = token
        data["invitation_sent_at"] = datetime.utcnow()
        data["is_active"] = True
        send_invite = True
    else:
        if not password:
            raise HTTPException(422, "Senha é obrigatória para administradores")
        data["hashed_password"] = get_password_hash(password)

    user = User(**data)
    db.add(user)
    db.commit()
    db.refresh(user)

    if send_invite:
        from app.services import email as email_service
        try:
            if user.role == UserRole.PROFESSOR:
                email_service.send_professor_invitation(
                    to_email=user.email,
                    professor_name=user.name,
                    institution_name=current_user.institution.name,
                    token=token,
                )
            else:
                email_service.send_student_invitation(
                    to_email=user.email,
                    student_name=user.name,
                    institution_name=current_user.institution.name,
                    token=token,
                )
        except Exception as exc:
            print(f"⚠️  Falha ao enviar convite para {user.email}: {exc}")

    return UserOut.from_user(user)


@router.get("/professors/by-subject/{subject_id}", response_model=List[UserOut])
def professors_by_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return professors teaching a specific subject in the current institution."""
    professor_ids = (
        db.query(TeachingAssignment.professor_id)
        .filter(TeachingAssignment.subject_id == subject_id)
        .distinct()
        .all()
    )
    ids = [r[0] for r in professor_ids]
    return (
        db.query(User)
        .filter(User.id.in_(ids), User.institution_id == current_user.institution_id)
        .all()
    )


@router.get("/students/by-class/{class_id}", response_model=List[UserOut])
def students_by_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.ADMIN, UserRole.PROFESSOR):
        raise HTTPException(403, "Sem acesso")
    class_ = db.get(Class, class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    if current_user.role == UserRole.PROFESSOR:
        teaches = (
            db.query(TeachingAssignment)
            .filter(TeachingAssignment.professor_id == current_user.id, TeachingAssignment.class_id == class_id)
            .first()
        )
        if not teaches:
            raise HTTPException(403, "Você não leciona nesta turma")
    enrollments = db.query(StudentClass).filter(StudentClass.class_id == class_id).all()
    ids = [e.student_id for e in enrollments]
    return db.query(User).filter(User.id.in_(ids), User.institution_id == current_user.institution_id).all()


@router.get("/{user_id}/assignments", response_model=List[TeachingAssignmentOut])
def get_user_assignments(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(403, "Sem acesso")
    professor = db.get(User, user_id)
    if not professor or professor.institution_id != current_user.institution_id:
        raise HTTPException(404, "Professor não encontrado")
    return db.query(TeachingAssignment).filter(TeachingAssignment.professor_id == user_id).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.get(User, user_id)
    if not user or user.institution_id != current_user.institution_id:
        raise HTTPException(404, "Usuário não encontrado")
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user or user.institution_id != current_user.institution_id:
        raise HTTPException(404, "Usuário não encontrado")
    data = payload.model_dump(exclude_none=True)
    if "password" in data:
        data["hashed_password"] = get_password_hash(data.pop("password"))
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/toggle-active", response_model=UserOut)
def toggle_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Activate or deactivate a user without deleting them."""
    user = db.get(User, user_id)
    if not user or user.institution_id != current_user.institution_id or user.deleted_at:
        raise HTTPException(404, "Usuário não encontrado")
    if user.id == current_user.id:
        raise HTTPException(400, "Não pode desativar a si mesmo")
    # Ao reativar um professor, respeita o limite do plano
    if not user.is_active and user.role == UserRole.PROFESSOR:
        from app.services import usage as usage_service
        if not usage_service.can_add_professor(db, current_user.institution_id):
            raise HTTPException(
                403,
                "Limite de professores do plano atingido. "
                "Faça upgrade do plano para reativar este professor.",
            )
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Soft-delete: marks deleted_at, blocks login, hides from all listings."""
    user = db.get(User, user_id)
    if not user or user.institution_id != current_user.institution_id:
        raise HTTPException(404, "Usuário não encontrado")
    if user.id == current_user.id:
        raise HTTPException(400, "Não pode excluir a si mesmo")
    if user.deleted_at:
        raise HTTPException(400, "Usuário já foi excluído")
    user.deleted_at = datetime.utcnow()
    user.is_active = False
    db.commit()


# ── Enrollments ───────────────────────────────────────────────────────────────

@router.post("/enroll", status_code=201)
def enroll_student(
    student_id: int,
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    student = db.get(User, student_id)
    if not student or student.role != UserRole.STUDENT:
        raise HTTPException(404, "Aluno não encontrado")
    class_ = db.get(Class, class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    existing = (
        db.query(StudentClass)
        .filter(StudentClass.student_id == student_id, StudentClass.class_id == class_id)
        .first()
    )
    if existing:
        raise HTTPException(400, "Aluno já matriculado nesta turma")
    db.add(StudentClass(student_id=student_id, class_id=class_id))
    db.commit()
    return {"message": "Aluno matriculado com sucesso"}


@router.delete("/enroll/{student_id}/{class_id}", status_code=204)
def unenroll_student(
    student_id: int,
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    class_ = db.get(Class, class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    enrollment = (
        db.query(StudentClass)
        .filter(StudentClass.student_id == student_id, StudentClass.class_id == class_id)
        .first()
    )
    if not enrollment:
        raise HTTPException(404, "Matrícula não encontrada")
    db.delete(enrollment)
    db.commit()


# ── Bulk Import ───────────────────────────────────────────────────────────────

class BulkImportPreview(BaseModel):
    valid: List[dict]
    errors: List[dict]
    total: int

@router.post("/bulk-import/preview", response_model=BulkImportPreview)
def preview_bulk_import(
    file: UploadFile = File(...),
    role: UserRole = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Parse CSV and return preview with valid rows and errors."""
    import csv
    import io
    
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(400, 'Arquivo deve ser CSV')
    
    raw = file.file.read().decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(raw))
    
    valid_rows = []
    error_rows = []
    
    existing_emails = {
        u.email.lower() 
        for u in db.query(User).filter(User.institution_id == current_user.institution_id).all()
    }
    
    for i, row in enumerate(reader, start=2):  # start=2 because row 1 is header
        name = (row.get('name') or row.get('nome') or '').strip()
        email = (row.get('email') or row.get('e-mail') or '').strip().lower()
        
        errors = []
        if not name:
            errors.append('Nome obrigatório')
        if not email:
            errors.append('Email obrigatório')
        elif '@' not in email:
            errors.append('Email inválido')
        elif email in existing_emails:
            errors.append('Email já cadastrado')
        
        if role == UserRole.STUDENT:
            class_name = (row.get('class') or row.get('turma') or '').strip()
            row_data = {'name': name, 'email': email, 'class_name': class_name}
        else:
            subjects = (row.get('subjects') or row.get('matérias') or '').strip()
            row_data = {'name': name, 'email': email, 'subjects': subjects}
        
        if errors:
            error_rows.append({'row': i, **row_data, 'errors': errors})
        else:
            valid_rows.append(row_data)
            existing_emails.add(email)  # prevent duplicates within same file
    
    return BulkImportPreview(valid=valid_rows, errors=error_rows, total=len(valid_rows) + len(error_rows))


@router.post("/bulk-import/confirm", status_code=201)
def confirm_bulk_import(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create users from validated rows. Returns count of created users."""
    role_str = payload.get('role', 'student')
    role = UserRole.STUDENT if role_str == 'student' else UserRole.PROFESSOR
    rows = payload.get('rows', [])
    
    if not rows:
        raise HTTPException(400, 'Nenhuma linha para importar')
    
    # Check professor limit
    if role == UserRole.PROFESSOR:
        from app.services import usage as usage_service
        remaining = usage_service.get_remaining_professors(db, current_user.institution_id)
        if remaining is not None and len(rows) > remaining:
            raise HTTPException(
                403,
                f'Limite de professores do plano atingido. Restam {remaining} vagas.'
            )
    
    created = 0
    failed = 0
    
    for row in rows:
        try:
            token = secrets.token_urlsafe(32)
            user = User(
                name=row['name'].strip(),
                email=row['email'].strip().lower(),
                hashed_password=get_password_hash(secrets.token_urlsafe(16)),
                role=role,
                institution_id=current_user.institution_id,
                invitation_token=token,
                invitation_sent_at=datetime.utcnow(),
                is_active=True,
            )
            db.add(user)
            db.flush()
            
            # Enroll student in class if specified
            if role == UserRole.STUDENT and row.get('class_name'):
                class_ = db.query(Class).filter(
                    Class.name == row['class_name'],
                    Class.institution_id == current_user.institution_id
                ).first()
                if class_:
                    db.add(StudentClass(student_id=user.id, class_id=class_.id))
            
            # Send invitation email
            from app.services import email as email_service
            try:
                if role == UserRole.PROFESSOR:
                    email_service.send_professor_invitation(
                        to_email=user.email,
                        professor_name=user.name,
                        institution_name=current_user.institution.name,
                        token=token,
                    )
                else:
                    email_service.send_student_invitation(
                        to_email=user.email,
                        student_name=user.name,
                        institution_name=current_user.institution.name,
                        token=token,
                    )
            except Exception as exc:
                print(f'⚠️ Falha ao enviar convite para {user.email}: {exc}')
            
            created += 1
        except Exception as exc:
            print(f'⚠️ Falha ao criar usuário {row.get("email")}: {exc}')
            failed += 1
    
    db.commit()
    return {'created': created, 'failed': failed}


# ── Professor CSV import ──────────────────────────────────────────────────────

class ProfessorCsvRowError(BaseModel):
    row: int
    email: Optional[str] = None
    message: str


class ProfessorCsvImportResult(BaseModel):
    created: int
    skipped: int
    errors: List[ProfessorCsvRowError]
    dry_run: bool = False


def _csv_get(row: dict, *keys: str) -> str:
    """Lê a primeira coluna presente entre os aliases (cabeçalho case-insensitive)."""
    for key in keys:
        value = row.get(key)
        if value:
            return value.strip()
    return ""


def _split_names(value: str) -> List[str]:
    return [p.strip() for p in value.replace(",", ";").split(";") if p.strip()]


@router.post("/professors/import-csv", response_model=ProfessorCsvImportResult)
def import_professors_csv(
    file: UploadFile = File(...),
    dry_run: bool = Query(False, description="Só valida, não grava nada"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Importa professores de um CSV (nome, email, materias, turmas).

    Cada professor é criado sem senha e recebe convite por e-mail — mesmo fluxo
    do cadastro individual. ``materias`` e ``turmas`` são opcionais, separados
    por ";"; quando os dois vêm preenchidos o professor é atribuído a cada
    matéria em cada turma. E-mails já cadastrados (em qualquer instituição) ou
    repetidos no próprio arquivo são pulados. Respeita o limite de professores
    do plano.
    """
    import csv
    import io

    from app.models import Subject
    from app.services import usage as usage_service

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Arquivo deve ser CSV")
    try:
        raw = file.file.read().decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(400, "Arquivo deve estar em UTF-8")

    # Excel em pt-BR costuma exportar com ";" — detecta o separador.
    first_line = raw.splitlines()[0] if raw else ""
    delimiter = ";" if first_line.count(";") > first_line.count(",") else ","
    reader = csv.DictReader(io.StringIO(raw), delimiter=delimiter)
    if reader.fieldnames:
        reader.fieldnames = [(f or "").strip().lower() for f in reader.fieldnames]
        if not ({"nome", "name"} & set(reader.fieldnames)) or not (
            {"email", "e-mail"} & set(reader.fieldnames)
        ):
            raise HTTPException(400, "CSV precisa das colunas nome e email")

    inst_id = current_user.institution_id
    subjects_by_name = {
        s.name.strip().lower(): s
        for s in db.query(Subject).filter(Subject.institution_id == inst_id).all()
    }
    # Turmas com o mesmo nome em anos diferentes: fica a do ano mais recente.
    classes_by_name: dict[str, Class] = {}
    for c in db.query(Class).filter(Class.institution_id == inst_id).order_by(Class.year).all():
        classes_by_name[c.name.strip().lower()] = c
        classes_by_name[f"{c.name.strip().lower()} · {c.year}"] = c
        classes_by_name[f"{c.name.strip().lower()} ({c.year})"] = c

    seen_emails: set[str] = set()
    # Mesmo critério do cadastro individual (usage_service.can_add_professor),
    # calculado uma vez para valer também no dry_run.
    from app.core.plans import get_plan_config
    from app.models import Institution
    inst = db.get(Institution, inst_id)
    max_professors = get_plan_config(inst.plan_type if inst else None)["max_professors"]
    remaining = (
        None if max_professors is None
        else max(0, max_professors - usage_service.active_professor_count(db, inst_id))
    )
    created = 0
    skipped = 0
    errors: List[ProfessorCsvRowError] = []
    invites: list[tuple[User, str]] = []

    for i, row in enumerate(reader, start=2):  # linha 1 = cabeçalho
        name = _csv_get(row, "nome", "name")
        email = _csv_get(row, "email", "e-mail").lower()
        if not name and not email:
            continue  # linha em branco
        if not name or not email or "@" not in email:
            errors.append(ProfessorCsvRowError(
                row=i, email=email or None,
                message="Nome e e-mail válidos são obrigatórios",
            ))
            continue
        if email in seen_emails or db.query(User.id).filter(func.lower(User.email) == email).first():
            skipped += 1
            errors.append(ProfessorCsvRowError(row=i, email=email, message="E-mail já cadastrado — linha ignorada"))
            continue
        seen_emails.add(email)

        subject_names = _split_names(_csv_get(row, "materias", "matérias", "subjects"))
        class_names = _split_names(_csv_get(row, "turmas", "turma", "classes"))
        row_subjects = []
        for sn in subject_names:
            s = subjects_by_name.get(sn.lower())
            if s:
                row_subjects.append(s)
            else:
                errors.append(ProfessorCsvRowError(row=i, email=email, message=f'Matéria "{sn}" não encontrada'))
        row_classes = []
        for cn in class_names:
            c = classes_by_name.get(cn.lower())
            if c:
                row_classes.append(c)
            else:
                errors.append(ProfessorCsvRowError(row=i, email=email, message=f'Turma "{cn}" não encontrada'))
        if (row_subjects and not class_names) or (row_classes and not subject_names):
            errors.append(ProfessorCsvRowError(
                row=i, email=email,
                message="Informe matérias e turmas juntas para atribuir o professor",
            ))

        if remaining is not None and created >= remaining:
            errors.append(ProfessorCsvRowError(
                row=i, email=email,
                message="Limite de professores do plano atingido — linha não importada",
            ))
            continue

        created += 1
        if dry_run:
            continue

        token = secrets.token_urlsafe(32)
        professor = User(
            name=name,
            email=email,
            hashed_password=get_password_hash(secrets.token_urlsafe(16)),
            role=UserRole.PROFESSOR,
            institution_id=inst_id,
            invitation_token=token,
            invitation_sent_at=datetime.utcnow(),
            is_active=True,
        )
        db.add(professor)
        db.flush()
        for s in row_subjects:
            for c in row_classes:
                db.add(TeachingAssignment(professor_id=professor.id, subject_id=s.id, class_id=c.id))
        invites.append((professor, token))

    if dry_run:
        return ProfessorCsvImportResult(created=created, skipped=skipped, errors=errors, dry_run=True)

    db.commit()

    from app.services import email as email_service
    institution_name = current_user.institution.name if current_user.institution else ""
    for professor, token in invites:
        try:
            email_service.send_professor_invitation(
                to_email=professor.email,
                professor_name=professor.name,
                institution_name=institution_name,
                token=token,
            )
        except Exception as exc:
            print(f"⚠️  Falha ao enviar convite para {professor.email}: {exc}")

    return ProfessorCsvImportResult(created=created, skipped=skipped, errors=errors)
