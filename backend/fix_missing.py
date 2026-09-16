import re

institutions = ["espm", "fgv", "uerj", "unicamp"]
all_missing = ["espm", "fgv", "uerj", "unicamp", "pucrs"]

# 1. Update models.py
with open("app/models.py", "r") as f:
    content = f.read()

fk_match = list(re.finditer(r"\s+[a-z_]+_question_id: Mapped\[Optional\[int\]\] = mapped_column\(ForeignKey\(\"[a-z_]+\.id\"\), nullable=True\)", content))
last_fk_end = fk_match[-1].end()

new_fks = ""
for inst in all_missing:
    if f"{inst}_question_id:" not in content:
        new_fks += f"\n    {inst}_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey(\"{inst}_questions.id\"), nullable=True)"

content = content[:last_fk_end] + new_fks + content[last_fk_end:]

rel_match = list(re.finditer(r"\s+[a-z_]+_question: Mapped\[Optional\[\"[A-Za-z]+Question\"\]\] = relationship\(\)", content))
last_rel_end = rel_match[-1].end()

new_rels = ""
for inst in all_missing:
    if f"{inst}_question:" not in content:
        new_rels += f"\n    {inst}_question: Mapped[Optional[\"{inst.capitalize()}Question\"]] = relationship()"

content = content[:last_rel_end] + new_rels + content[last_rel_end:]

with open("app/models.py", "w") as f:
    f.write(content)

# 2. Update schemas.py
with open("app/schemas.py", "r") as f:
    content = f.read()

new_schemas = ""
for inst in all_missing:
    if f"class {inst.capitalize()}QuestionSchema" not in content:
        new_schemas += f"""

class {inst.capitalize()}QuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {{"from_attributes": True}}

class {inst.capitalize()}QuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    statement: str
    options: list[{inst.capitalize()}QuestionOptionSchema]
    
    model_config = {{"from_attributes": True}}
"""
with open("app/schemas.py", "w") as f:
    f.write(content + new_schemas)

# 3. Update main.py
with open("app/main.py", "r") as f:
    content = f.read()

stmts = []
for inst in institutions:
    if f"CREATE TABLE IF NOT EXISTS {inst}_questions" not in content:
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

for inst in all_missing:
    if f"ALTER TABLE simulado_questions ADD COLUMN IF NOT EXISTS {inst}_question_id" not in content:
        stmts.append(f"        \"ALTER TABLE simulado_questions ADD COLUMN IF NOT EXISTS {inst}_question_id INTEGER REFERENCES {inst}_questions(id) ON DELETE CASCADE\"")

if stmts:
    stmts_joined = ",\n".join(stmts) + ",\n"
    init_match = re.search(r"init_stmts\s*=\s*\[(.*?)\]", content, re.DOTALL)
    if init_match:
        inner = init_match.group(1)
        new_inner = inner + ",\n" + stmts_joined
        content = content[:init_match.start(1)] + new_inner + content[init_match.end(1):]

with open("app/main.py", "w") as f:
    f.write(content)

print("Missing models, schemas and SQL statements added.")
