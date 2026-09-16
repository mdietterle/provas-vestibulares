"""ENEM seed logic — importado por main.py (startup) e pelo router de admin."""

import base64
import json
import re
from pathlib import Path

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models import Base, EnemQuestion, EnemQuestionOption

ENEM_DIR = Path(__file__).parent.parent.parent.parent / "provas" / "enem"

_AREA_D1 = {(1, 45): "Linguagens e Códigos", (46, 90): "Ciências Humanas", (91, 99): "Língua Estrangeira"}
_AREA_D2 = {(96, 135): "Ciências da Natureza", (136, 180): "Matemática"}


def _get_area(number: int, day: int) -> str:
    area_map = _AREA_D1 if day == 1 else _AREA_D2
    for (lo, hi), area in area_map.items():
        if lo <= number <= hi:
            return area
    return "Geral"


def _detect_language(content_list: list) -> str:
    """Detecta se o texto é em inglês ou espanhol para questões de língua estrangeira."""
    text = " ".join(
        item["content"] for item in content_list
        if item.get("type") == "text" and item.get("content")
    ).lower()
    spanish_markers = ["¿", "¡", " el ", " la ", " los ", " las ", " que ", " del ", " está ", " son "]
    if any(m in text for m in spanish_markers):
        return "Espanhol"
    return "Inglês"


def _build_statement(content_list: list) -> str:
    return " ".join(
        item["content"].strip()
        for item in content_list
        if item.get("type") == "text" and item.get("content", "").strip()
    )


def _find_image_b64(content_list: list, json_path: Path) -> str | None:
    for item in content_list:
        if item.get("type") != "image":
            continue
        img_name = Path(item["content"]).name
        img_dir = json_path.parent / f"img {json_path.stem}"
        candidate = img_dir / img_name
        if not candidate.exists():
            matches = list(json_path.parent.rglob(img_name))
            candidate = matches[0] if matches else None
        if candidate and candidate.exists():
            try:
                data = base64.b64encode(candidate.read_bytes()).decode()
                return f"data:image/png;base64,{data}"
            except Exception:
                pass
    return None


def run_migrations_enem(conn):
    """Create ENEM tables if they don't exist (called with an active connection)."""
    from sqlalchemy import text
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS enem_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            number INTEGER NOT NULL,
            area VARCHAR(100),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number)
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS enem_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES enem_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )
    """))


def seed_enem(db: Session | None = None, **kwargs) -> dict:
    """Import ENEM questions from local JSON files. Returns a result summary."""
    if not ENEM_DIR.exists():
        return {"skipped": True, "reason": "Pasta enem/ não encontrada"}

    json_files = sorted(ENEM_DIR.glob("*.json"))
    if not json_files:
        return {"skipped": True, "reason": "Nenhum arquivo JSON encontrado"}

    # Ensure tables exist
    try:
        with engine.begin() as conn:
            run_migrations_enem(conn)
    except Exception as e:
        return {"error": f"Falha ao criar tabelas: {e}"}

    close_after = db is None
    if db is None:
        db = SessionLocal()

    total_added = 0
    results = []
    try:
        for json_path in json_files:
            year_m = re.search(r"_(\d{4})_", json_path.stem)
            day_m = re.search(r"_D(\d+)_", json_path.stem)
            year = int(year_m.group(1)) if year_m else 0
            day = int(day_m.group(1)) if day_m else 1
            exam_name = f"ENEM {year} – Dia {day}"

            already = db.query(EnemQuestion).filter(EnemQuestion.exam_name == exam_name).count()
            if already > 0:
                results.append({"exam": exam_name, "added": 0, "existing": already})
                continue

            with open(json_path, encoding="utf-8") as f:
                data = json.load(f)

            # Pre-scan: identify numbers that appear more than once (foreign language questions)
            from collections import Counter
            number_counts = Counter(
                raw.get("number", 0) for raw in data.get("data", [])
                if _build_statement(raw.get("content", []))
            )
            duplicated_numbers = {n for n, c in number_counts.items() if c > 1}

            added = 0
            seen_numbers: set[int] = set()
            for raw in data.get("data", []):
                number = raw.get("number", 0)
                content = raw.get("content", [])
                statement = _build_statement(content)
                if not statement:
                    continue
                image_b64 = _find_image_b64(content, json_path)
                area = _get_area(number, day)

                # Detect language for duplicated numbers (foreign language: Inglês/Espanhol)
                language = _detect_language(content) if number in duplicated_numbers else None

                # Skip true duplicates (same number AND same language)
                key = (number, language)
                if key in seen_numbers:
                    continue
                seen_numbers.add(key)

                q = EnemQuestion(
                    exam_name=exam_name, year=year, number=number,
                    area=area, language=language, statement=statement, image_base64=image_b64,
                )
                db.add(q)
                db.flush()

                for idx_str, alt in raw.get("alternatives", {}).items():
                    alt_text = _build_statement(alt.get("content", []))
                    db.add(EnemQuestionOption(
                        question_id=q.id,
                        letter=alt.get("alternative", ""),
                        text=alt_text,
                        is_correct=bool(alt.get("correct", False)),
                        order=int(idx_str),
                    ))
                added += 1

            db.commit()
            total_added += added
            results.append({"exam": exam_name, "added": added})

        return {"total_added": total_added, "files": results}
    except Exception as e:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()
