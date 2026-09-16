import re

with open("app/models.py", "r") as f:
    content = f.read()

institutions = ["Ufg", "Ufjf", "Ufu", "Ufv", "Ufpa", "Utfpr", "Unioeste", "Ufmg", "Uel"]

new_models = ""
for inst in institutions:
    lower_inst = inst.lower()
    new_models += f"""

class {inst}Question(Base):
    __tablename__ = "{lower_inst}_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["{inst}QuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="{inst}QuestionOption.order"
    )

class {inst}QuestionOption(Base):
    __tablename__ = "{lower_inst}_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("{lower_inst}_questions.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["{inst}Question"] = relationship(back_populates="options")
"""

# Now we need to add these foreign keys and relationships to SimuladoQuestion
# Find SimuladoQuestion class definition
simulado_start = content.find("class SimuladoQuestion(Base):")
if simulado_start == -1:
    print("SimuladoQuestion not found!")
    exit(1)

# Find the end of foreign keys in SimuladoQuestion to inject new ones
fk_match = list(re.finditer(r"\s+[a-z]+_question_id: Mapped\[Optional\[int\]\] = mapped_column\(ForeignKey\(\"[a-z_]+\.id\"\), nullable=True\)", content))
last_fk_end = fk_match[-1].end()

new_fks = ""
for inst in institutions:
    lower_inst = inst.lower()
    new_fks += f"\n    {lower_inst}_question_id: Mapped[Optional[int]] = mapped_column(ForeignKey(\"{lower_inst}_questions.id\"), nullable=True)"

content = content[:last_fk_end] + new_fks + content[last_fk_end:]

# Do the same for relationships
rel_match = list(re.finditer(r"\s+[a-z]+_question: Mapped\[Optional\[\"[A-Za-z]+Question\"\]\] = relationship\(\)", content))
last_rel_end = rel_match[-1].end()

new_rels = ""
for inst in institutions:
    lower_inst = inst.lower()
    new_rels += f"\n    {lower_inst}_question: Mapped[Optional[\"{inst}Question\"]] = relationship()"

content = content[:last_rel_end] + new_rels + content[last_rel_end:]

with open("app/models.py", "w") as f:
    f.write(content + new_models)

print("Models appended and SimuladoQuestion updated.")
