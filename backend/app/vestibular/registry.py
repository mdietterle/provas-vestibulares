"""Exam type registry for unified vestibular_questions table.
Defines metadata schema, option variant, and unique constraint fields per exam.
"""
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass(frozen=True)
class ExamConfig:
    """Configuration for a single exam type in the unified table."""
    label: str
    metadata_keys: List[str] = field(default_factory=list)
    unique_fields: List[str] = field(default_factory=lambda: ["exam_name", "number"])
    option_variant: str = "letter"  # "letter", "value", "no_letter"
    has_images: bool = False
    has_html_statement: bool = False


EXAM_TYPE_REGISTRY: dict[str, ExamConfig] = {
    "enem": ExamConfig(
        label="ENEM",
        metadata_keys=["color", "module", "day", "area", "language", "subject", "difficulty"],
        unique_fields=["exam_name", "number", "language"],
    ),
    "ufpr": ExamConfig(
        label="UFPR",
        metadata_keys=["university", "area", "language"],
        unique_fields=["exam_name", "number", "language"],
    ),
    "acafe": ExamConfig(
        label="ACAFE",
        metadata_keys=["period", "area", "language", "justification", "reference_matrix"],
        unique_fields=["exam_name", "number", "language"],
        has_images=True,
    ),
    "ufrgs": ExamConfig(
        label="UFRGS",
        metadata_keys=["day", "area"],
        unique_fields=["exam_name", "number"],
    ),
    "pucpr": ExamConfig(
        label="PUCPR",
        metadata_keys=["season", "course", "color", "area", "language"],
        unique_fields=["exam_name", "number", "language"],
    ),
    "ufsc": ExamConfig(
        label="UFSC",
        metadata_keys=["university", "phase", "color", "question_type", "area", "language"],
        unique_fields=["exam_name", "number", "language"],
        has_images=True,
    ),
    "fgv": ExamConfig(
        label="FGV",
        metadata_keys=["area"],
        unique_fields=["exam_name", "number"],
    ),
    "espm": ExamConfig(
        label="ESPM",
        metadata_keys=["area"],
        unique_fields=["exam_name", "number"],
    ),
    "ita": ExamConfig(
        label="ITA",
        metadata_keys=["area"],
        unique_fields=["exam_name", "number"],
    ),
    "udesc": ExamConfig(
        label="UDESC",
        metadata_keys=["semester", "shift", "area", "language"],
        unique_fields=["exam_name", "number"],
    ),
    "ufpel": ExamConfig(
        label="UFPEL",
        metadata_keys=["area"],
        unique_fields=["exam_name", "number"],
    ),
    "unicamp": ExamConfig(
        label="UNICAMP",
        metadata_keys=["area"],
        unique_fields=["exam_name", "number"],
    ),
    "fuvest": ExamConfig(
        label="FUVEST",
        metadata_keys=["version", "area"],
        unique_fields=["exam_name", "number"],
    ),
    "ufgd": ExamConfig(
        label="UFGD",
        metadata_keys=["university", "area", "question_type"],
        unique_fields=["exam_name", "number", "area"],
        has_images=True,
    ),
    "uem": ExamConfig(
        label="UEM",
        metadata_keys=["university", "season", "question_type", "area", "language"],
        unique_fields=["exam_name", "number", "area"],
        option_variant="value",
        has_images=True,
    ),
    "ufms": ExamConfig(
        label="UFMS",
        metadata_keys=["stage", "subject"],
        unique_fields=["exam_name", "number"],
        has_html_statement=True,
        has_images=True,
    ),
    "ufg": ExamConfig(label="UFG", metadata_keys=["area"], option_variant="no_letter"),
    "ufjf": ExamConfig(label="UFJF", metadata_keys=["area"], option_variant="no_letter"),
    "ufu": ExamConfig(label="UFU", metadata_keys=["area"], option_variant="no_letter"),
    "ufpa": ExamConfig(label="UFPA", metadata_keys=["area"], option_variant="no_letter"),
    "utfpr": ExamConfig(label="UTFPR", metadata_keys=["area"], option_variant="no_letter"),
    "unioeste": ExamConfig(label="UNIOESTE", metadata_keys=["area"], option_variant="no_letter"),
    "uel": ExamConfig(label="UEL", metadata_keys=["area"], option_variant="no_letter"),
    "pucminas": ExamConfig(
        label="PUC Minas",
        metadata_keys=["subject"],
        option_variant="no_letter",
        has_images=True,
    ),
    "ufrn": ExamConfig(label="UFRN", metadata_keys=["area"], option_variant="no_letter"),
    "ufsm": ExamConfig(label="UFSM", metadata_keys=["area"], option_variant="no_letter"),
    "ulbra": ExamConfig(label="ULBRA", metadata_keys=["edition"], option_variant="no_letter"),
    "ufam": ExamConfig(label="UFAM", metadata_keys=["stage", "subject"], option_variant="no_letter"),
    "puccampinas": ExamConfig(
        label="PUC Campinas",
        metadata_keys=[],
        option_variant="no_letter",
        has_images=True,
    ),
    "unimontes": ExamConfig(
        label="Unimontes",
        metadata_keys=["area", "subject"],
        option_variant="no_letter",
    ),
    "unicentro": ExamConfig(label="Unicentro", metadata_keys=["area"], option_variant="no_letter"),
    "unaerp": ExamConfig(label="Unaerp", metadata_keys=[], option_variant="no_letter"),
    "upf": ExamConfig(
        label="UPF",
        metadata_keys=["area"],
        unique_fields=["exam_name", "number", "area"],
    ),
    "concurso_fepese": ExamConfig(
        label="Concurso Fepese",
        metadata_keys=["concurso_slug", "orgao", "edital", "exam_type", "cargo", "cargo_code"],
        unique_fields=["concurso_slug", "cargo_code", "number"],
    ),
}


def get_exam_config(exam_type: str) -> Optional[ExamConfig]:
    """Return config for exam_type or None if unknown."""
    return EXAM_TYPE_REGISTRY.get(exam_type.lower())


def all_exam_types() -> list[str]:
    """Return sorted list of all registered exam types."""
    return sorted(EXAM_TYPE_REGISTRY.keys())