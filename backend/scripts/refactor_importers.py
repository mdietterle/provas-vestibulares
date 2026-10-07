"""Refatora importadores legados para usar save_vestibular_question adapter.

Uso: python3 -m scripts.refactor_importers [--dry-run] [--exam-type enem]

Para cada importer (seed.py ou pdf_import.py):
1. Adiciona import save_vestibular_question se ausente
2. Remove import do model legado (EnemQuestion, etc.)
3. Substitui bloco de criação Question + Options por chamada ao adapter

NOTA: Script faz transformação textual conservadora. Casos complexos
(ex: lógica condicional entre add/commit) requerem revisão manual.
Sempre rode --dry-run primeiro e revise diff antes de aplicar.
"""

import argparse
import re
from pathlib import Path

SERVICES_DIR = Path(__file__).resolve().parent.parent / "app" / "services"

# Mapeamento exam_type -> nome do model legado
LEGACY_MODELS = {
    "acafe": ("AcafeQuestion", "AcafeQuestionOption", "AcafeQuestionImage"),
    "enem": ("EnemQuestion", "EnemQuestionOption", None),
    "espm": ("EspmQuestion", "EspmQuestionOption", "EspmQuestionImage"),
    "fgv": ("FgvQuestion", "FgvQuestionOption", "FgvQuestionImage"),
    "fuvest": ("FuvestQuestion", "FuvestQuestionOption", "FuvestQuestionImage"),
    "ita": ("ItaQuestion", "ItaQuestionOption", "ItaQuestionImage"),
    "puccampinas": ("PuccampinasQuestion", "PuccampinasQuestionOption", "PuccampinasQuestionImage"),
    "pucminas": ("PucminasQuestion", "PucminasQuestionOption", "PucminasQuestionImage"),
    "pucpr": ("PucprQuestion", "PucprQuestionOption", None),
    "pucrio": ("PucRioQuestion", "PucRioQuestionOption", "PucRioQuestionImage"),
    "pucrs": ("PucrsQuestion", "PucrsQuestionOption", "PucrsQuestionImage"),
    "udesc": ("UdescQuestion", "UdescQuestionOption", "UdescQuestionImage"),
    "uel": ("UelQuestion", "UelQuestionOption", None),
    "uem": ("UemQuestion", "UemQuestionOption", "UemQuestionImage"),
    "ufam": ("UfamQuestion", "UfamQuestionOption", None),
    "ufg": ("UfgQuestion", "UfgQuestionOption", None),
    "ufgd": ("UfgdQuestion", "UfgdQuestionOption", "UfgdQuestionImage"),
    "ufjf": ("UfjfQuestion", "UfjfQuestionOption", None),
    "ufms": ("UfmsQuestion", "UfmsQuestionOption", "UfmsQuestionImage"),
    "ufpa": ("UfpaQuestion", "UfpaQuestionOption", None),
    "ufpel": ("UfpelQuestion", "UfpelQuestionOption", "UfpelQuestionImage"),
    "ufpr": ("UfprQuestion", "UfprQuestionOption", "UfprQuestionImage"),
    "ufrgs": ("UfrgsQuestion", "UfrgsQuestionOption", None),
    "ufrn": ("UfrnQuestion", "UfrnQuestionOption", None),
    "ufsc": ("UfscQuestion", "UfscQuestionOption", "UfscQuestionImage"),
    "ufsm": ("UfsmQuestion", "UfsmQuestionOption", None),
    "ufu": ("UfuQuestion", "UfuQuestionOption", None),
    "ulbra": ("UlbraQuestion", "UlbraQuestionOption", None),
    "unaerp": ("UnaerpQuestion", "UnaerpQuestionOption", None),
    "unicamp": ("UnicampQuestion", "UnicampQuestionOption", "UnicampQuestionImage"),
    "unicentro": ("UnicentroQuestion", "UnicentroQuestionOption", None),
    "unimontes": ("UnimontesQuestion", "UnimontesQuestionOption", None),
    "unioeste": ("UnioesteQuestion", "UnioesteQuestionOption", None),
    "unesp": ("UnespQuestion", "UnespQuestionOption", "UnespQuestionImage"),
    "upf": ("UpfQuestion", "UpfQuestionOption", None),
    "utfpr": ("UtfprQuestion", "UtfprQuestionOption", None),
    "concurso_fepese": ("ConcursoFepeseQuestion", "ConcursoFepeseQuestionOption", None),
}


def find_importer_files(exam_type: str | None = None) -> list[tuple[str, Path]]:
    """Retorna lista de (exam_type, path) para todos os importadores."""
    results = []
    for et in LEGACY_MODELS:
        if exam_type and et != exam_type:
            continue
        service_dir = SERVICES_DIR / et
        if not service_dir.exists():
            continue
        for fname in ("seed.py", "pdf_import.py"):
            fpath = service_dir / fname
            if fpath.exists():
                results.append((et, fpath))
    return results


def has_legacy_usage(content: str, exam_type: str) -> bool:
    """Verifica se arquivo ainda usa model legado."""
    model_name = LEGACY_MODELS[exam_type][0]
    return model_name in content


def add_adapter_import(content: str) -> str:
    """Adiciona import do save_vestibular_question se ausente."""
    if "save_vestibular_question" in content:
        return content
    # Insere após último import existente
    lines = content.split("\n")
    last_import_idx = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("from ") or stripped.startswith("import "):
            last_import_idx = i
    lines.insert(
        last_import_idx + 1,
        "from app.services.import_batch import save_vestibular_question",
    )
    return "\n".join(lines)


def remove_legacy_imports(content: str, exam_type: str) -> str:
    """Remove imports dos models legados."""
    q_model, opt_model, img_model = LEGACY_MODELS[exam_type]
    patterns = [q_model]
    if opt_model:
        patterns.append(opt_model)
    if img_model:
        patterns.append(img_model)

    lines = content.split("\n")
    new_lines = []
    for line in lines:
        # Remove linha de import que contém qualquer model legado
        if any(p in line for p in patterns) and (
            line.strip().startswith("from ") or line.strip().startswith("import ")
        ):
            continue
        new_lines.append(line)
    return "\n".join(new_lines)


def refactor_file(exam_type: str, path: Path, dry_run: bool = True) -> bool:
    """Refatora um arquivo. Retorna True se fez alterações."""
    content = path.read_text()

    if not has_legacy_usage(content, exam_type):
        print(f"  ⏭️  {path.name}: já refatorado ou sem uso legado")
        return False

    original = content

    # Passo 1: adicionar import adapter
    content = add_adapter_import(content)

    # Passo 2: remover imports legados
    content = remove_legacy_imports(content, exam_type)

    # Passo 3: substituições textuais conservadoras
    # NOTA: Transformação completa do bloco de escrita requer análise AST
    # ou regex muito específico por importer. Aqui fazemos apenas o setup
    # (imports) e deixamos a conversão do corpo como TODO documentado.
    q_model = LEGACY_MODELS[exam_type][0]

    # Adiciona comentário TODO onde model legado é instanciado
    content = re.sub(
        rf"^(\s*)({re.escape(q_model)}\()",
        r"\1# TODO: refactor to save_vestibular_question(db, exam_type='{}', ...)\n\1\2".format(
            exam_type
        ),
        content,
        flags=re.MULTILINE,
    )

    if content == original:
        print(f"  ⏭️  {path.name}: sem alterações detectáveis automaticamente")
        return False

    if dry_run:
        print(f"  🔍 {path.name}: ALTERAÇÕES PENDENTES (dry-run)")
        # Mostra diff resumido
        orig_lines = original.split("\n")
        new_lines = content.split("\n")
        added = len(new_lines) - len(orig_lines)
        print(f"     Linhas: {len(orig_lines)} → {len(new_lines)} ({added:+d})")
    else:
        path.write_text(content)
        print(f"  ✅ {path.name}: refatorado (imports + TODO markers)")

    return True


def main():
    parser = argparse.ArgumentParser(description="Refatora importadores para adapter unificado")
    parser.add_argument("--dry-run", action="store_true", help="Não escreve arquivos")
    parser.add_argument("--exam-type", type=str, help="Refatorar apenas este exam_type")
    args = parser.parse_args()

    files = find_importer_files(args.exam_type)
    print(f"📦 Importadores encontrados: {len(files)}")
    print(f"🔧 Modo: {'DRY-RUN' if args.dry_run else 'LIVE'}\n")

    changed = 0
    for exam_type, path in sorted(files):
        print(f"[{exam_type}] {path.relative_to(SERVICES_DIR.parent)}")
        if refactor_file(exam_type, path, dry_run=args.dry_run):
            changed += 1

    print(f"\n📊 Total alterado: {changed}/{len(files)}")
    if args.dry_run and changed > 0:
        print("💡 Rode sem --dry-run para aplicar alterações.")
        print("⚠️  Após aplicar, revise cada arquivo e complete a conversão dos blocos de escrita.")


if __name__ == "__main__":
    main()