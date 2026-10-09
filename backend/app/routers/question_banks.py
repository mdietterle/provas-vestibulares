from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_professor
from app.database import Base
from app.models import User

router = APIRouter(prefix="/api/question-banks", tags=["question-banks"])

# Universidades com uma tela dedicada de banco de questões no ambiente do professor
# (rota do frontend + endpoint de importação). Mantido em código pois cada uma exige
# uma tela própria — a contagem abaixo é que decide se ela aparece ou não no menu.
BANK_SLUGS = ["enem", "acafe", "ufpr", "ufrgs", "pucpr", "ita"]


@router.get("/available")
def list_available_banks(
    db: Session = Depends(get_db),
    _: User = Depends(require_professor),
):
    """Retorna, para cada universidade com tela de banco de questões, se ela
    de fato tem questões importadas no banco — para o menu do professor não
    oferecer bancos vazios."""
    result = []
    for slug in BANK_SLUGS:
        table = Base.metadata.tables.get(f"{slug}_questions")
        if table is None:
            continue
        count = db.execute(select(func.count()).select_from(table)).scalar() or 0
        result.append({"slug": slug, "count": count})
    return result
