"""Router for Mind Maps – student study tool."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import MindMap, User, UserRole

router = APIRouter(prefix="/mindmaps", tags=["mindmaps"])


# ── Pydantic schemas ───────────────────────────────────────────────────────────


class MindMapNode(BaseModel):
    id: str
    text: str
    x: float
    y: float
    color: Optional[str] = None
    parent_id: Optional[str] = None


class MindMapData(BaseModel):
    nodes: List[MindMapNode]
    connections: List[Dict[str, str]]  # [{"from": "id1", "to": "id2"}]


class CreateMindMapRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    data: MindMapData


class UpdateMindMapRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    data: Optional[MindMapData] = None


# ── Helpers ────────────────────────────────────────────────────────────────────


def _serialize_mindmap(m: MindMap) -> Dict[str, Any]:
    return {
        "id": m.id,
        "title": m.title,
        "data": m.data,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }


# ── Student endpoints ──────────────────────────────────────────────────────────


@router.post("", status_code=201)
def create_mindmap(
    payload: CreateMindMapRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student creates a new mind map."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(403, "Apenas alunos podem criar mapas mentais")

    mindmap = MindMap(
        student_id=current_user.id,
        title=payload.title,
        data=payload.data.model_dump(),
    )
    db.add(mindmap)
    db.commit()
    db.refresh(mindmap)
    return _serialize_mindmap(mindmap)


@router.get("/mine")
def list_my_mindmaps(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all mind maps created by the current student."""
    mindmaps = (
        db.query(MindMap)
        .filter(MindMap.student_id == current_user.id)
        .order_by(MindMap.updated_at.desc())
        .all()
    )
    return [_serialize_mindmap(m) for m in mindmaps]


@router.get("/{mindmap_id}")
def get_mindmap(
    mindmap_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single mind map. Students see only their own."""
    mindmap = db.get(MindMap, mindmap_id)
    if not mindmap:
        raise HTTPException(404, "Mapa mental não encontrado")

    if mindmap.student_id != current_user.id:
        raise HTTPException(403, "Acesso negado")

    return _serialize_mindmap(mindmap)


@router.put("/{mindmap_id}")
def update_mindmap(
    mindmap_id: int,
    payload: UpdateMindMapRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a mind map (title and/or data)."""
    mindmap = db.get(MindMap, mindmap_id)
    if not mindmap:
        raise HTTPException(404, "Mapa mental não encontrado")

    if mindmap.student_id != current_user.id:
        raise HTTPException(403, "Acesso negado")

    if payload.title is not None:
        mindmap.title = payload.title
    if payload.data is not None:
        mindmap.data = payload.data.model_dump()

    mindmap.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(mindmap)
    return _serialize_mindmap(mindmap)


@router.delete("/{mindmap_id}", status_code=204)
def delete_mindmap(
    mindmap_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a mind map."""
    mindmap = db.get(MindMap, mindmap_id)
    if not mindmap:
        raise HTTPException(404, "Mapa mental não encontrado")

    if mindmap.student_id != current_user.id:
        raise HTTPException(403, "Acesso negado")

    db.delete(mindmap)
    db.commit()
    return None