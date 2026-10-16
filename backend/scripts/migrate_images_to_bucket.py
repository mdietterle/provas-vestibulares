"""Migrate legacy base64 images from vestibular_questions.image_base64 to Supabase Storage.

Uploads any non-null image_base64 values to the bucket, creates corresponding
VestibularQuestionImage rows with image_url, then nulls out the legacy field.
Safe to run multiple times — skips rows already migrated or already null.
"""
from __future__ import annotations

import sys
import os

# Add backend root to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.vestibular.models import VestibularQuestion, VestibularQuestionImage
from app.services.r2_storage import upload_image


def migrate_legacy_images(dry_run: bool = False) -> dict:
    """Migrate all legacy image_base64 values to bucket storage.

    Returns dict with counts: total_checked, migrated, skipped_already_migrated, errors.
    """
    db: Session = SessionLocal()
    stats = {
        "total_checked": 0,
        "migrated": 0,
        "skipped_already_migrated": 0,
        "skipped_null": 0,
        "errors": 0,
    }

    try:
        # Find all questions with non-null image_base64
        questions_with_images = (
            db.query(VestibularQuestion)
            .filter(VestibularQuestion.image_base64.isnot(None))
            .all()
        )

        stats["total_checked"] = len(questions_with_images)
        print(f"Found {stats['total_checked']} questions with legacy image_base64 data")

        for vq in questions_with_images:
            try:
                # Check if already has an image in the images table
                existing_img = (
                    db.query(VestibularQuestionImage)
                    .filter_by(question_id=vq.id, order=0)
                    .first()
                )

                if existing_img and existing_img.image_url:
                    # Already migrated, just null out the legacy field
                    if not dry_run:
                        vq.image_base64 = None
                        db.commit()
                    stats["skipped_already_migrated"] += 1
                    continue

                # Upload to bucket
                image_url = upload_image(
                    vq.image_base64,
                    exam_type=vq.exam_type,
                    year=vq.year,
                    number=vq.number,
                )

                if not dry_run:
                    # Create image row if doesn't exist
                    if not existing_img:
                        img_row = VestibularQuestionImage(
                            question_id=vq.id,
                            image_url=image_url,
                            order=0,
                        )
                        db.add(img_row)
                    else:
                        existing_img.image_url = image_url

                    # Null out legacy field
                    vq.image_base64 = None
                    db.commit()

                stats["migrated"] += 1
                print(f"  Migrated {vq.exam_type}/{vq.year} q{vq.number}")

            except Exception as exc:
                stats["errors"] += 1
                print(f"  ERROR migrating {vq.exam_type}/{vq.year} q{vq.number}: {exc}")
                db.rollback()
                continue

        print(f"\nMigration complete:")
        print(f"  Total checked: {stats['total_checked']}")
        print(f"  Migrated: {stats['migrated']}")
        print(f"  Skipped (already migrated): {stats['skipped_already_migrated']}")
        print(f"  Errors: {stats['errors']}")

        return stats

    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Migrate legacy base64 images to bucket")
    parser.add_argument("--dry-run", action="store_true", help="Don't actually modify DB")
    args = parser.parse_args()

    migrate_legacy_images(dry_run=args.dry_run)