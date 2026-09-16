import os

institutions = ["ufg", "ufjf", "ufu", "ufv", "ufpa", "utfpr", "unioeste", "ufmg", "uel"]

# Create service dirs
for inst in institutions:
    os.makedirs(f"app/services/{inst}", exist_ok=True)
    with open(f"app/services/{inst}/__init__.py", "w") as f:
        pass
    
    # Simple boilerplate for pdf_import
    with open(f"app/services/{inst}/pdf_import.py", "w") as f:
        f.write(f"""import fitz
import asyncio
from sqlalchemy.orm import Session
from app.models import {inst.capitalize()}Question, {inst.capitalize()}QuestionOption

async def process_and_import_{inst}_from_url(url: str, year: int, db: Session):
    # TODO: Implement PDF parsing using fitz
    return {{"status": "not_implemented"}}

async def import_all(db: Session):
    return {{"status": "not_implemented"}}
""")

# Create routers
for inst in institutions:
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

print("Endpoints and services generated.")
