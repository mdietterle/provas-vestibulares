"""Admin endpoints for system maintenance tasks.
Owner-only access required for all routes.
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import require_owner
from app.models import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/migrate-images-to-bucket")
def migrate_images_to_bucket(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """Trigger migration of legacy base64 images to Supabase Storage.
    Runs in background to avoid timeout on large datasets.
    Returns immediately with task status.
    """
    from app.services.r2_storage import upload_image
    from app.vestibular.models import VestibularQuestion, VestibularQuestionImage

    def run_migration():
        stats = {"total": 0, "migrated": 0, "skipped": 0, "errors": 0}
        questions = (
            db.query(VestibularQuestion)
            .filter(VestibularQuestion.image_base64.isnot(None))
            .all()
        )
        stats["total"] = len(questions)

        for vq in questions:
            try:
                existing = (
                    db.query(VestibularQuestionImage)
                    .filter_by(question_id=vq.id, order=0)
                    .first()
                )
                if existing and existing.image_url:
                    vq.image_base64 = None
                    db.commit()
                    stats["skipped"] += 1
                    continue

                image_url = upload_image(
                    vq.image_base64,
                    exam_type=vq.exam_type,
                    year=vq.year,
                    number=vq.number,
                )

                if not existing:
                    db.add(VestibularQuestionImage(
                        question_id=vq.id,
                        image_url=image_url,
                        order=0,
                    ))
                else:
                    existing.image_url = image_url

                vq.image_base64 = None
                db.commit()
                stats["migrated"] += 1
            except Exception:
                db.rollback()
                stats["errors"] += 1

        return stats

    background_tasks.add_task(run_migration)
    return {
        "status": "started",
        "message": "Migration running in background. Check logs for progress.",
    }