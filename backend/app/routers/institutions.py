import base64
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Institution, User, UserRole
from app.schemas import InstitutionCreate, InstitutionOut, InstitutionPublicOut, InstitutionUpdate
from app.services.subjects import seed_default_subjects

router = APIRouter(prefix="/institutions", tags=["institutions"])


@router.get("", response_model=List[InstitutionOut])
def list_institutions(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    # Platform owner sees all; every other role sees only their own institution.
    if current_user.role == UserRole.OWNER:
        return db.query(Institution).all()
    return db.query(Institution).filter(Institution.id == current_user.institution_id).all()


@router.get("/public", response_model=List[InstitutionPublicOut])
def search_institutions_public(q: str = "", db: Session = Depends(get_db)):
    """Busca pública (sem autenticação) de instituições, usada no auto-cadastro do aluno."""
    query = db.query(Institution)
    if q.strip():
        query = query.filter(Institution.name.ilike(f"%{q.strip()}%"))
    return query.order_by(Institution.name).limit(20).all()


@router.post("", response_model=InstitutionOut, status_code=201)
def create_institution(
    payload: InstitutionCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    inst = Institution(**payload.model_dump())
    db.add(inst)
    db.flush()
    seed_default_subjects(db, inst.id)
    db.commit()
    db.refresh(inst)
    return inst


@router.get("/{institution_id}", response_model=InstitutionOut)
def get_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inst = db.get(Institution, institution_id)
    if not inst:
        raise HTTPException(404, "Instituição não encontrada")
    if current_user.institution_id != institution_id and current_user.role != UserRole.OWNER:
        raise HTTPException(403, "Sem permissão")
    return inst


@router.put("/{institution_id}", response_model=InstitutionOut)
def update_institution(
    institution_id: int,
    payload: InstitutionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    inst = db.get(Institution, institution_id)
    if not inst:
        raise HTTPException(404, "Instituição não encontrada")
    if current_user.institution_id != institution_id:
        raise HTTPException(403, "Sem permissão")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(inst, field, value)
    db.commit()
    db.refresh(inst)
    return inst


@router.post("/{institution_id}/logo", response_model=InstitutionOut)
async def upload_logo(
    institution_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if current_user.institution_id != institution_id:
        raise HTTPException(403, "Sem permissão")
    inst = db.get(Institution, institution_id)
    if not inst:
        raise HTTPException(404, "Instituição não encontrada")
    if file.content_type not in ("image/png", "image/jpeg", "image/webp"):
        raise HTTPException(400, "Formato inválido. Use PNG, JPEG ou WebP.")
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(400, "Imagem muito grande. Máximo 2 MB.")
    encoded = base64.b64encode(content).decode()
    inst.logo = f"data:{file.content_type};base64,{encoded}"
    db.commit()
    db.refresh(inst)
    return inst


@router.delete("/{institution_id}/logo", response_model=InstitutionOut)
def remove_logo(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if current_user.institution_id != institution_id:
        raise HTTPException(403, "Sem permissão")
    inst = db.get(Institution, institution_id)
    if not inst:
        raise HTTPException(404, "Instituição não encontrada")
    inst.logo = None
    db.commit()
    db.refresh(inst)
    return inst
