"""Migrate existing base64 images from DB to Cloudflare R2.

Usage: python -m scripts.migrate_images_to_r2 [--dry-run] [--table questions]
"""
import argparse
import base64
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import SessionLocal
from app.services.storage import upload_image

TABLES_WITH_IMAGES = [
    ("questions", "image_base64"),
    ("enem_questions", "image_base64"),
    ("ufpr_questions", "image_base64"),
    ("ufrgs_questions", "image_base64"),
    ("acafe_questions", "image_base64"),
    ("pucpr_questions", "image_base64"),
    ("fgv_questions", "image_base64"),
    ("espm_questions", "image_base64"),
    ("ita_questions", "image_base64"),
    ("udesc_questions", "image_base64"),
    ("ufpel_questions", "image_base64"),
    ("unicamp_questions", "image_base64"),
    ("simulado_questions", "image_base64"),
    ("submissions", "essay_image_base64"),
    ("users", "avatar"),
]


def _decode_base64(raw: str) -> tuple[bytes, str]:
    """Decode base64 string (with or without data URI header). Return bytes and mime."""
    if "," in raw:
        header, b64_data = raw.split(",", 1)
        mime = header.split(";")[0].replace("data:", "") if "image/" in header else "image/png"
    else:
        b64_data = raw
        mime = "image/png"
    return base64.b64decode(b64_data), mime


def migrate_table(table: str, column: str, dry_run: bool = False) -> dict:
    """Migrate one table's base64 column to R2 URLs."""
    stats = {"total": 0, "migrated": 0, "skipped": 0, "errors": 0}
    db = SessionLocal()
    try:
        rows = db.execute(
            text(f"SELECT id, {column} FROM {table} WHERE {column} IS NOT NULL AND {column} != ''")
        ).fetchall()
        stats["total"] = len(rows)

        for row in rows:
            row_id, raw_value = row
            if not raw_value:
                stats["skipped"] += 1
                continue
            # Already a URL — skip
            if raw_value.startswith("http://") or raw_value.startswith("https://"):
                stats["skipped"] += 1
                continue
            try:
                img_bytes, mime = _decode_base64(raw_value)
                prefix = table.replace("_questions", "").replace("_", "-")
                if dry_run:
                    stats["migrated"] += 1
                    continue
                url = upload_image(img_bytes, content_type=mime, prefix=prefix)
                db.execute(
                    text(f"UPDATE {table} SET {column} = :url WHERE id = :id"),
                    {"url": url, "id": row_id},
                )
                db.commit()
                stats["migrated"] += 1
            except Exception as e:
                print(f"  ERROR {table}[{row_id}]: {e}", file=sys.stderr)
                stats["errors"] += 1
                db.rollback()
    finally:
        db.close()
    return stats


def main():
    parser = argparse.ArgumentParser(description="Migrate base64 images to R2")
    parser.add_argument("--dry-run", action="store_true", help="Count only, no uploads")
    parser.add_argument("--table", type=str, default=None, help="Migrate single table only")
    args = parser.parse_args()

    tables = TABLES_WITH_IMAGES
    if args.table:
        tables = [(t, c) for t, c in tables if t == args.table]
        if not tables:
            print(f"Table '{args.table}' not found. Available: {[t for t, _ in TABLES_WITH_IMAGES]}")
            sys.exit(1)

    grand_total = {"total": 0, "migrated": 0, "skipped": 0, "errors": 0}
    mode = "DRY RUN" if args.dry_run else "LIVE"
    print(f"[{mode}] Starting migration across {len(tables)} tables...")

    for table, column in tables:
        print(f"\n  {table}.{column}...", end=" ", flush=True)
        stats = migrate_table(table, column, dry_run=args.dry_run)
        print(f"total={stats['total']} migrated={stats['migrated']} skipped={stats['skipped']} errors={stats['errors']}")
        for k in grand_total:
            grand_total[k] += stats[k]

    print(f"\n{'='*60}")
    print(f"[{mode}] DONE: total={grand_total['total']} migrated={grand_total['migrated']} "
          f"skipped={grand_total['skipped']} errors={grand_total['errors']}")


if __name__ == "__main__":
    main()