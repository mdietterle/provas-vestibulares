"""Deduplicate vestibular_questions by (exam_type, year, number).

Keeps the newest record per key, re-points ExamVestibularQuestion rows
to the kept id, then deletes older duplicates. Safe to run idempotently.

Usage:
    python -m scripts.deduplicate_vestibular_questions [--dry-run]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Allow running as module from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from app.database import SessionLocal


def deduplicate(*, dry_run: bool = False) -> dict:
    db = SessionLocal()
    try:
        # Find duplicate groups: same (exam_type, year, number), more than one row
        dup_groups = db.execute(text("""
            SELECT exam_type, year, number, COUNT(*) AS cnt
            FROM vestibular_questions
            GROUP BY exam_type, year, number
            HAVING COUNT(*) > 1
        """)).fetchall()

        if not dup_groups:
            print("No duplicates found.")
            return {"duplicates_found": 0, "deleted": 0, "repointed": 0}

        total_deleted = 0
        total_repointed = 0

        for row in dup_groups:
            etype, year, number, cnt = row
            # Keep the newest (highest id)
            rows = db.execute(text("""
                SELECT id FROM vestibular_questions
                WHERE exam_type = :et AND year = :y AND number = :n
                ORDER BY id DESC
            """), {"et": etype, "y": year, "n": number}).fetchall()

            keep_id = rows[0][0]
            delete_ids = [r[0] for r in rows[1:]]

            if dry_run:
                print(f"  [{etype}/{year}/#{number}] keep={keep_id}, delete={delete_ids}")
                total_deleted += len(delete_ids)
                continue

            # Re-point ExamVestibularQuestion references to kept record
            for old_id in delete_ids:
                repointed = db.execute(text("""
                    UPDATE exam_vestibular_questions
                    SET vestibular_question_id = :keep
                    WHERE vestibular_question_id = :old
                      AND NOT EXISTS (
                          SELECT 1 FROM exam_vestibular_questions evq2
                          WHERE evq2.exam_id = exam_vestibular_questions.exam_id
                            AND evq2.vestibular_question_id = :keep
                      )
                """), {"keep": keep_id, "old": old_id}).rowcount
                total_repointed += repointed

            # Delete duplicates (cascade removes options/images)
            deleted = db.execute(text("""
                DELETE FROM vestibular_questions WHERE id IN :ids
            """), {"ids": tuple(delete_ids)}).rowcount
            total_deleted += deleted

        if not dry_run:
            db.commit()
            print(f"Done: {total_deleted} deleted, {total_repointed} references repointed.")
        else:
            print(f"[DRY RUN] Would delete {total_deleted} rows.")

        return {
            "duplicates_found": len(dup_groups),
            "deleted": total_deleted,
            "repointed": total_repointed,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    deduplicate(dry_run=args.dry_run)