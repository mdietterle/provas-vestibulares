"""Endpoint genérico de upload de PDF para importação manual de provas.

Unifica ENEM, UFSC, ITA, ACAFE (URL), PUCPR (URL) e demais vestibulares
que já possuem `/admin/import-pdf` ou serviço equivalente num único ponto
de entrada para o painel de importadores."""
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.deps import require_owner
from app.models import User

router = APIRouter(prefix="/upload-pdf", tags=["upload-pdf"])


# Mapa de vestibular → função de importação PDF existente.
# Cada entrada aponta para o módulo/serviço que já faz o parse real;
# este router só orquestra o upload e delega.
_PDF_IMPORTERS = {
    "enem": {
        "module": "app.services.enem.pdf_import",
        "func": "import_enem_pdf",
        "extra_forms": ["day", "color", "module"],
    },
    "ufsc": {
        "module": "app.services.ufsc.pdf_import",
        "func": "import_ufsc_pdf",
        "extra_forms": ["phase", "color"],
    },
    "ita": {
        "module": "app.services.ita.pdf_import",
        "func": "import_ita_pdf",
        "extra_forms": ["phase", "subject"],
    },
}


@router.post("", status_code=200)
async def upload_pdf_generic(
    exam_type: str = Form(..., description="Slug do vestibular (enem, ufsc, ita, ...)"),
    year: int = Form(...),
    prova: UploadFile = File(...),
    gabarito: Optional[UploadFile] = File(None),
    force_reimport: bool = Form(False),
    # Campos opcionais específicos por vestibular — enviados como form fields
    # extras pelo frontend quando relevantes.
    day: Optional[int] = Form(None),
    color: Optional[str] = Form(None),
    module: Optional[str] = Form(None),
    phase: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    _: User = Depends(require_owner),
):
    """Owner-only: recebe PDF da prova (+ gabarito opcional) e delega ao
    importador específico do vestibular informado em `exam_type`."""
    if prova.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(400, "O arquivo da prova deve ser um PDF.")

    importer = _PDF_IMPORTERS.get(exam_type.lower())
    if importer is None:
        raise HTTPException(
            400,
            f"Vestibular '{exam_type}' não suporta upload de PDF. "
            f"Opções disponíveis: {', '.join(sorted(_PDF_IMPORTERS))}.",
        )

    import importlib

    mod = importlib.import_module(importer["module"])
    func = getattr(mod, importer["func"])

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        prova_path = tmp_path / "prova.pdf"
        prova_path.write_bytes(await prova.read())

        gabarito_path = None
        if gabarito is not None:
            ext = ".html" if (gabarito.filename or "").lower().endswith((".html", ".htm")) else ".pdf"
            gabarito_path = tmp_path / f"gabarito{ext}"
            gabarito_path.write_bytes(await gabarito.read())

        kwargs: dict = {
            "prova_path": prova_path,
            "gabarito_path": gabarito_path,
            "year": year,
        }
        # Repassa apenas os campos extras que o importador aceita.
        extra_map = {
            "day": day,
            "color": color,
            "module": module,
            "phase": phase,
            "subject": subject,
            "force_reimport": force_reimport,
        }
        for key in importer.get("extra_forms", []) + ["force_reimport"]:
            val = extra_map.get(key)
            if val is not None:
                kwargs[key] = val

        try:
            result = func(**kwargs)
        except Exception as e:
            raise HTTPException(500, f"Erro ao importar PDF ({exam_type}): {e}")

    return {"ok": True, "exam_type": exam_type, **result}