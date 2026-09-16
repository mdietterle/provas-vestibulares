import os
import re

institutions = [
    "unifei", "pucminas", "uepg", "upe", "ufrn", "ufsm", "ufla", "ufam", 
    "pucsp", "unifor", "uece", "puccampinas", "unimontes", "unicentro", 
    "uesb", "unaerp", "uema"
]

# 1. Update models.py
with open("app/models.py", "r") as f:
    content = f.read()

new_models = ""
for inst in institutions:
    lower_inst = inst.lower()
    if f"class {inst.capitalize()}Question(Base):" not in content:
        new_models += f"""

class {inst.capitalize()}Question(Base):
    __tablename__ = "{lower_inst}_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["{inst.capitalize()}QuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="{inst.capitalize()}QuestionOption.order"
    )

class {inst.capitalize()}QuestionOption(Base):
    __tablename__ = "{lower_inst}_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("{lower_inst}_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["{inst.capitalize()}Question"] = relationship(back_populates="options")
"""

fk_match = list(re.finditer(r"\s+[a-z_]+_question_id: Mapped\[Optional\[int\]\] = mapped_column\(ForeignKey\(\"[a-z_]+\.id\"\), nullable=True\)", content))
last_fk_end = fk_match[-1].end() if fk_match else -1

new_fks = ""
for inst in institutions:
    lower_inst = inst.lower()
    if f"{lower_inst}_question_id:" not in content:
        new_fks += f"\n    {lower_inst}_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey(\"{lower_inst}_questions.id\"), nullable=True)"

if new_fks and last_fk_end != -1:
    content = content[:last_fk_end] + new_fks + content[last_fk_end:]

rel_match = list(re.finditer(r"\s+[a-z_]+_question: Mapped\[Optional\[\"[A-Za-z]+Question\"\]\] = relationship\(\)", content))
last_rel_end = rel_match[-1].end() if rel_match else -1

new_rels = ""
for inst in institutions:
    lower_inst = inst.lower()
    if f"{lower_inst}_question:" not in content:
        new_rels += f"\n    {lower_inst}_question: Mapped[Optional[\"{inst.capitalize()}Question\"]] = relationship()"

if new_rels and last_rel_end != -1:
    content = content[:last_rel_end] + new_rels + content[last_rel_end:]

with open("app/models.py", "w") as f:
    f.write(content + new_models)

print("1. models.py updated")

# 2. Update schemas.py
with open("app/schemas.py", "r") as f:
    content = f.read()

new_schemas = ""
for inst in institutions:
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

print("2. schemas.py updated")

# 3. Generate Endpoints and Services
for inst in institutions:
    os.makedirs(f"app/services/{inst}", exist_ok=True)
    with open(f"app/services/{inst}/__init__.py", "w") as f:
        pass
    
    with open(f"app/services/{inst}/pdf_import.py", "w") as f:
        f.write(f"""import fitz
import asyncio
from sqlalchemy.orm import Session
from app.models import {inst.capitalize()}Question, {inst.capitalize()}QuestionOption

async def process_and_import_{inst}_from_url(url: str, year: int, db: Session):
    return {{"status": "not_implemented"}}

async def import_all(db: Session):
    return {{"status": "not_implemented"}}
""")

    with open(f"app/routers/{inst}.py", "w") as f:
        f.write(f"""from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import {inst.capitalize()}Question, {inst.capitalize()}QuestionOption, User
from app.schemas import {inst.capitalize()}QuestionSchema
from app.services.{inst}.pdf_import import import_all
from app.routers.auth import get_current_user

router = APIRouter(prefix="/{inst}", tags=["{inst.upper()}"])

@router.get("/questions", response_model=List[{inst.capitalize()}QuestionSchema])
def get_questions(db: Session = Depends(get_db)):
    questions = db.query({inst.capitalize()}Question).all()
    return questions

@router.post("/import")
async def start_import(background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Not authorized")
    background_tasks.add_task(import_all, db)
    return {{"message": "Import started"}}
""")
print("3. routers and services generated")

# 4. Update main.py
with open("app/main.py", "r") as f:
    content = f.read()

# 4.1 Imports
router_imports = ""
for inst in institutions:
    if f"from app.routers import {inst}" not in content:
        router_imports += f"from app.routers import {inst}\n"

import_match = re.search(r"from app\.routers import \w+(?:,\s*\w+)*\s*", content)
if import_match and router_imports:
    content = content[:import_match.end()] + router_imports + content[import_match.end():]

# 4.2 Register routers
routers_reg = ""
for inst in institutions:
    if f"app.include_router({inst}.router" not in content:
        routers_reg += f"app.include_router({inst}.router, prefix=\"/api\")\n"

reg_match = re.search(r"app\.include_router\(owner\.router, prefix=\"/api\"\)\n", content)
if reg_match and routers_reg:
    content = content[:reg_match.end()] + routers_reg + content[reg_match.end():]

# 4.3 DDL Statements
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

for inst in institutions:
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

print("4. main.py updated")

# 5. Update frontend api/index.ts
frontend_api_path = "../frontend/src/api/index.ts"
with open(frontend_api_path, "r") as f:
    content = f.read()

new_exports = ""
for inst in institutions:
    if f"export const {inst}Api =" not in content:
        new_exports += f"""
export const {inst}Api = {{
  runImportAll: async (params?: any) => {{
    const response = await api.post('/{inst}/import', params)
    return response.data
  }}
}}
"""
if new_exports:
    with open(frontend_api_path, "w") as f:
        f.write(content + new_exports)
print("5. frontend api/index.ts updated")

# 6. Update frontend OwnerPage.tsx
frontend_owner_path = "../frontend/src/pages/OwnerPage.tsx"
with open(frontend_owner_path, "r") as f:
    content = f.read()

new_imports = []
for inst in institutions:
    if f"{inst}Api" not in content:
        new_imports.append(f"{inst}Api")

imports_str = ""
if new_imports:
    imports_str = "\n  " + ",\n  ".join(new_imports) + ","

sources_str = ""
for inst in institutions:
    if f"key: '{inst}'" not in content:
        sources_str += f"  {{ key: '{inst}', label: '{inst.upper()}', description: 'Importador {inst.upper()} (PDF)', runSeed: () => {inst}Api.runImportAll() }},\n"

if imports_str:
    import_match = re.search(r"  unicampApi,\n} from '\.\./api'", content)
    if import_match:
        content = content[:import_match.start()] + "  unicampApi," + imports_str + "\n} from '../api'" + content[import_match.end():]
    else:
        # Fallback if unicampApi isn't there
        import_match_fallback = re.search(r"  udescApi,\n} from '\.\./api'", content)
        if import_match_fallback:
            content = content[:import_match_fallback.start()] + "  udescApi," + imports_str + "\n} from '../api'" + content[import_match_fallback.end():]

if sources_str:
    sources_match = re.search(r"  { key: 'unicamp',.*?\n]", content)
    if sources_match:
        content = content[:sources_match.start()] + sources_match.group(0)[:-1] + sources_str + "]" + content[sources_match.end():]
    else:
        sources_match_fallback = re.search(r"  { key: 'udesc',.*?\n]", content)
        if sources_match_fallback:
            content = content[:sources_match_fallback.start()] + sources_match_fallback.group(0)[:-1] + sources_str + "]" + content[sources_match_fallback.end():]


with open(frontend_owner_path, "w") as f:
    f.write(content)

print("6. frontend OwnerPage.tsx updated")
print("Onda 3 scaffolding complete!")
