from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the 20 most recent events relevant to the current user."""
    since = datetime.utcnow() - timedelta(days=7)

    if current_user.role in ("admin", "professor"):
        rows = db.execute(
            text("""
                SELECT
                    es.id,
                    es.status,
                    es.total_score,
                    es.submitted_at,
                    s.name  AS student_name,
                    e.title AS exam_title,
                    u.id    AS professor_id
                FROM exam_submissions es
                JOIN users s    ON s.id = es.student_id
                JOIN exams e    ON e.id = es.exam_id
                JOIN users u    ON u.id = e.professor_id
                WHERE u.institution_id = :inst_id
                  AND (:role = 'admin' OR u.id = :user_id)
                  AND es.submitted_at >= :since
                ORDER BY es.submitted_at DESC
                LIMIT 20
            """),
            {
                "inst_id": current_user.institution_id,
                "user_id": current_user.id,
                "role": current_user.role,
                "since": since,
            },
        ).fetchall()

        events = []
        for row in rows:
            status = row[1].lower()
            if status == "pending":
                msg = f'{row[4]} enviou a prova "{row[5]}"'
                kind = "submission"
            elif status == "done":
                msg = f"Correção de {row[4]} concluída — {row[5]}"
                kind = "correction"
            elif status == "released":
                msg = f"Nota de {row[4]} liberada — {row[5]}"
                kind = "release"
            else:
                msg = f"{row[4]} está sendo corrigido — {row[5]}"
                kind = "correcting"

            events.append({
                "id": row[0],
                "kind": kind,
                "message": msg,
                "score": row[2],
                "at": row[3].isoformat() if row[3] else None,
                "read": False,
            })

        return events

    # Student: see their own submissions
    rows = db.execute(
        text("""
            SELECT
                es.id,
                es.status,
                es.total_score,
                es.submitted_at,
                e.title AS exam_title
            FROM exam_submissions es
            JOIN exams e ON e.id = es.exam_id
            WHERE es.student_id = :user_id
              AND es.submitted_at >= :since
            ORDER BY es.submitted_at DESC
            LIMIT 20
        """),
        {"user_id": current_user.id, "since": since},
    ).fetchall()

    events = []
    for row in rows:
        status = row[1].lower()
        if status == "released":
            msg = f'Sua nota na prova "{row[4]}" foi liberada: {row[2]} pts'
            kind = "release"
        elif status == "done":
            msg = f'Prova "{row[4]}" corrigida. Aguardando liberação.'
            kind = "correction"
        else:
            msg = f'Prova "{row[4]}" recebida. Aguardando correção.'
            kind = "submission"

        events.append({
            "id": row[0],
            "kind": kind,
            "message": msg,
            "score": row[2],
            "at": row[3].isoformat() if row[3] else None,
            "read": False,
        })

    return events
