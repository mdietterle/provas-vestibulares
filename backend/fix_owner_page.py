import re

institutions = [
    "unifei", "pucminas", "uepg", "upe", "ufrn", "ufsm", "ufla", "ufam", 
    "pucsp", "unifor", "uece", "puccampinas", "unimontes", "unicentro", 
    "uesb", "unaerp", "uema"
]

frontend_owner_path = "frontend/src/pages/OwnerPage.tsx"
with open(frontend_owner_path, "r") as f:
    content = f.read()

# Fix IMPORT_SOURCES array
sources_str = ""
for inst in institutions:
    if f"key: '{inst}'" not in content:
        sources_str += f"  {{ key: '{inst}', label: '{inst.upper()}', description: 'Importador {inst.upper()} (PDF)', runSeed: () => {inst}Api.runImportAll() }},\n"

if sources_str:
    # Find the closing bracket of IMPORT_SOURCES
    match = re.search(r"const IMPORT_SOURCES: ImportSource\[\] = \[.*?\]\n", content, re.DOTALL)
    if match:
        arr_content = match.group(0)
        # insert before the closing bracket
        new_arr_content = arr_content[:-2] + ",\n" + sources_str + "]\n"
        content = content[:match.start()] + new_arr_content + content[match.end():]

with open(frontend_owner_path, "w") as f:
    f.write(content)

print("OwnerPage.tsx updated successfully.")
