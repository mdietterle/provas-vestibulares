from sqlalchemy.orm import Session

from app.core.subjects import STANDARD_SUBJECTS
from app.models import Subject


def seed_default_subjects(db: Session, institution_id: int) -> None:
    """Cria as matérias padrão (BNCC) para uma instituição, pulando as que já existem.

    Idempotente: seguro chamar tanto na criação de uma nova instituição quanto
    como backfill para instituições já existentes.
    """
    existing = {
        name.lower()
        for (name,) in db.query(Subject.name).filter(Subject.institution_id == institution_id).all()
    }
    for name in STANDARD_SUBJECTS:
        if name.lower() not in existing:
            db.add(Subject(name=name, institution_id=institution_id))
