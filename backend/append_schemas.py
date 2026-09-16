import re

with open("app/schemas.py", "r") as f:
    content = f.read()

institutions = ["Ufg", "Ufjf", "Ufu", "Ufv", "Ufpa", "Utfpr", "Unioeste", "Ufmg", "Uel"]

new_schemas = ""
for inst in institutions:
    lower_inst = inst.lower()
    new_schemas += f"""

class {inst}QuestionOptionSchema(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int
    
    model_config = {{"from_attributes": True}}

class {inst}QuestionSchema(BaseModel):
    id: int
    year: int
    number: int
    statement: str
    options: list[{inst}QuestionOptionSchema]
    
    model_config = {{"from_attributes": True}}
"""

with open("app/schemas.py", "w") as f:
    f.write(content + new_schemas)

print("Schemas appended.")
