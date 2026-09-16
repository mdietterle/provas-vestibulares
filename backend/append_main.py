import re

with open("app/main.py", "r") as f:
    content = f.read()

institutions = ["ufg", "ufjf", "ufu", "ufv", "ufpa", "utfpr", "unioeste", "ufmg", "uel"]

# 1. Imports
router_imports = ""
for inst in institutions:
    router_imports += f"from app.routers import {inst}\n"

# Insert imports after existing routers
import_match = re.search(r"from app\.routers import \w+(?:,\s*\w+)*\s*", content)
if import_match:
    content = content[:import_match.end()] + router_imports + content[import_match.end():]

# 2. Register routers
routers_reg = ""
for inst in institutions:
    routers_reg += f"app.include_router({inst}.router, prefix=\"/api\")\n"

# Insert registers near app.include_router(enem.router, prefix="/api")
reg_match = re.search(r"app\.include_router\(owner\.router, prefix=\"/api\"\)\n", content)
if reg_match:
    content = content[:reg_match.end()] + routers_reg + content[reg_match.end():]

# 3. Add to init_stmts list
stmts = []
for inst in institutions:
    stmts.append(f"""        \"\"\"CREATE TABLE IF NOT EXISTS {inst}_questions (
            id SERIAL PRIMARY KEY,
            year INTEGER NOT NULL,
            number INTEGER NOT NULL,
            statement TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )\"\"\"""")
    stmts.append(f"""        \"\"\"CREATE TABLE IF NOT EXISTS {inst}_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES {inst}_questions(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            order_idx INTEGER DEFAULT 0
        )\"\"\"""")
    stmts.append(f"        \"ALTER TABLE simulado_questions ADD COLUMN IF NOT EXISTS {inst}_question_id INTEGER REFERENCES {inst}_questions(id) ON DELETE CASCADE\"")

stmts_joined = ",\n".join(stmts) + ",\n"

# Find where init_stmts ends and insert
init_match = re.search(r"init_stmts\s*=\s*\[(.*?)\]", content, re.DOTALL)
if init_match:
    inner = init_match.group(1)
    new_inner = inner + ",\n" + stmts_joined
    content = content[:init_match.start(1)] + new_inner + content[init_match.end(1):]

with open("app/main.py", "w") as f:
    f.write(content)

print("Main.py updated.")
