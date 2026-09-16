"""
Seed script: import ENEM questions from JSON files in the enem/ folder.

Usage:
  cd backend
  python seed_enem.py

Requires DATABASE_URL to be set (same as the app).
"""

import base64
import json
import os
import re
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal, engine
from app.models import Base, EnemQuestion, EnemQuestionOption

ENEM_DIR = Path(__file__).parent / "provas" / "enem"

# Map day code → area labels per question range
# D1 = Linguagens (1-45) + Ciências Humanas (46-90) + Língua Estrangeira (91-95)
AREA_MAP_D1 = {
    (1, 45): "Linguagens e Códigos",
    (46, 90): "Ciências Humanas",
    (91, 95): "Língua Estrangeira",
}
# D2 = Ciências da Natureza (96-135) + Matemática (136-180)
AREA_MAP_D2 = {
    (96, 135): "Ciências da Natureza",
    (136, 180): "Matemática",
}


def get_area(number: int, day: int) -> str:
    area_map = AREA_MAP_D1 if day == 1 else AREA_MAP_D2
    for (lo, hi), area in area_map.items():
        if lo <= number <= hi:
            return area
    return "Geral"


def parse_exam_name(filename: str) -> dict:
    """Extract year and day from filename like output_2025_PV_impresso_D1_CD1."""
    year_match = re.search(r"_(\d{4})_", filename)
    day_match = re.search(r"_D(\d+)_", filename)
    year = int(year_match.group(1)) if year_match else 0
    day = int(day_match.group(1)) if day_match else 1
    day_label = "Dia 1" if day == 1 else "Dia 2"
    return {"year": year, "day": day, "exam_name": f"ENEM {year} – {day_label}"}


def build_statement(content_list: list) -> str:
    """Concatenate text segments, skip image entries."""
    parts = []
    for item in content_list:
        if item.get("type") == "text":
            text = item.get("content", "").strip()
            if text:
                parts.append(text)
    return " ".join(parts)


def find_image(content_list: list, json_path: Path) -> str | None:
    """Find the image entry and resolve path relative to enem folder."""
    for item in content_list:
        if item.get("type") == "image":
            raw_path = item.get("content", "")
            # Extract filename from the path
            img_filename = Path(raw_path).name  # e.g. question-5.png
            # Look in the img folder next to the JSON
            stem = json_path.stem  # output_2025_PV_impresso_D1_CD1
            img_dir = json_path.parent / f"img {stem}"
            candidate = img_dir / img_filename
            if candidate.exists():
                return str(candidate)
            # Fallback: search recursively
            for found in json_path.parent.rglob(img_filename):
                return str(found)
    return None


def encode_image(path: str | None) -> str | None:
    if not path:
        return None
    try:
        with open(path, "rb") as f:
            data = base64.b64encode(f.read()).decode()
        return f"data:image/png;base64,{data}"
    except Exception as e:
        print(f"  ⚠️  Imagem não encontrada: {path} ({e})")
        return None


def seed_json_file(db, json_path: Path):
    meta = parse_exam_name(json_path.stem)
    exam_name = meta["exam_name"]
    year = meta["year"]
    day = meta["day"]

    print(f"\n📄  Processando: {json_path.name}  →  {exam_name}")

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    questions = data.get("data", [])
    added = 0
    skipped = 0

    for raw in questions:
        number = raw.get("number", 0)
        statement = build_statement(raw.get("content", []))
        if not statement:
            print(f"  ⚠️  Q{number}: sem enunciado — ignorado")
            continue

        # Check duplicate
        existing = (
            db.query(EnemQuestion)
            .filter(EnemQuestion.exam_name == exam_name, EnemQuestion.number == number)
            .first()
        )
        if existing:
            skipped += 1
            continue

        image_path = find_image(raw.get("content", []), json_path)
        image_b64 = encode_image(image_path)

        area = get_area(number, day)

        q = EnemQuestion(
            exam_name=exam_name,
            year=year,
            number=number,
            area=area,
            statement=statement,
            image_base64=image_b64,
        )
        db.add(q)
        db.flush()

        alts = raw.get("alternatives", {})
        for idx_str, alt in alts.items():
            letter = alt.get("alternative", "")
            alt_text = build_statement(alt.get("content", []))
            is_correct = bool(alt.get("correct", False))
            order = int(idx_str)
            db.add(
                EnemQuestionOption(
                    question_id=q.id,
                    letter=letter,
                    text=alt_text,
                    is_correct=is_correct,
                    order=order,
                )
            )

        added += 1

    db.commit()
    print(f"  ✅  {added} questões inseridas, {skipped} já existiam.")
    return added


def main():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    json_files = sorted(ENEM_DIR.glob("*.json"))
    if not json_files:
        print("❌  Nenhum arquivo JSON encontrado em", ENEM_DIR)
        sys.exit(1)

    db = SessionLocal()
    total = 0
    try:
        for json_path in json_files:
            total += seed_json_file(db, json_path)
    finally:
        db.close()

    print(f"\n🎉  Total: {total} questões ENEM importadas.")


if __name__ == "__main__":
    main()
