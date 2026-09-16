import re

with open("src/pages/OwnerPage.tsx", "r") as f:
    content = f.read()

institutions = ["ufg", "ufjf", "ufu", "ufv", "ufpa", "utfpr", "unioeste", "ufmg", "uel"]

imports = "\n  " + ",\n  ".join([f"{inst}Api" for inst in institutions]) + ","
sources = ""
for inst in institutions:
    sources += f"  {{ key: '{inst}', label: '{inst.upper()}', description: 'Importador {inst.upper()} (PDF)', runSeed: () => {inst}Api.runImportAll() }},\n"

# Add imports
import_match = re.search(r"  unicampApi,\n} from '\.\./api'", content)
if import_match:
    content = content[:import_match.start()] + "  unicampApi," + imports + "\n} from '../api'" + content[import_match.end():]

# Add sources
sources_match = re.search(r"  { key: 'unicamp',.*?\n]", content)
if sources_match:
    content = content[:sources_match.start()] + sources_match.group(0)[:-1] + sources + "]" + content[sources_match.end():]

with open("src/pages/OwnerPage.tsx", "w") as f:
    f.write(content)

print("OwnerPage updated.")
