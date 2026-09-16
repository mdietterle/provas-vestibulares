import io
import re
import zipfile
from html.parser import HTMLParser
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.deps import get_current_user, require_professor
from app.models import (
    Class,
    Exam,
    ExamQuestion,
    Institution,
    Question,
    QuestionType,
    StudentClass,
    Subject,
    TeachingAssignment,
    User,
    UserRole,
)
from app.schemas import ExamApply, ExamCreate, ExamCreateRedacao, ExamListOut, ExamOut, ExamUpdate

router = APIRouter(prefix="/exams", tags=["exams"])


# Questões importadas de bancos públicos têm a origem embutida no fim do
# enunciado no formato "[ENEM 2023 – Q45]". Separamos isso para exibir como
# uma marcação de fonte na prova (online e PDF).
_SOURCE_RE = re.compile(r"\s*\[\s*([^\]]*?(?:–|-)\s*Q\s*\d+[^\]]*?)\s*\]\s*$", re.IGNORECASE)
_SOURCE_RE_SIMPLE = re.compile(
    r"\s*\[\s*((?:ENEM|ACAFE|UFPR|UFSC)[^\]]*?)\s*\]\s*$", re.IGNORECASE
)


def _extract_source(statement: str) -> tuple[str, Optional[str]]:
    """Retorna (enunciado_sem_marcador, fonte_normalizada|None)."""
    if not statement:
        return statement, None
    m = _SOURCE_RE.search(statement) or _SOURCE_RE_SIMPLE.search(statement)
    if not m:
        return statement, None
    source = re.sub(r"\s*[–-]\s*", " · ", m.group(1))
    source = re.sub(r"\s+", " ", source).strip()
    cleaned = statement[: m.start()].rstrip()
    return cleaned, source


def _assert_exam_manage_access(db: Session, exam: Optional[Exam], current_user: User):
    """Only professors/admins from the exam's own institution may edit/delete it."""
    if not exam:
        raise HTTPException(404, "Prova não encontrada")
    subject = db.get(Subject, exam.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(403, "Sem acesso")
    if current_user.role == UserRole.PROFESSOR and exam.professor_id != current_user.id:
        raise HTTPException(403, "Sem acesso")


def _assert_exam_view_access(db: Session, exam: Optional[Exam], current_user: User):
    """Institution-scoped read access; students must be enrolled in the exam's class."""
    if not exam:
        raise HTTPException(404, "Prova não encontrada")
    subject = db.get(Subject, exam.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(403, "Sem acesso")
    if current_user.role == UserRole.PROFESSOR and exam.professor_id != current_user.id:
        raise HTTPException(403, "Sem acesso")
    if current_user.role == UserRole.STUDENT:
        enrolled = (
            db.query(StudentClass)
            .filter(StudentClass.student_id == current_user.id, StudentClass.class_id == exam.class_id)
            .first()
        )
        if not enrolled:
            raise HTTPException(403, "Sem acesso")


def _assert_professor_teaches(db: Session, professor_id: int, subject_id: int, class_id: int):
    exists = (
        db.query(TeachingAssignment)
        .filter(
            TeachingAssignment.professor_id == professor_id,
            TeachingAssignment.subject_id == subject_id,
            TeachingAssignment.class_id == class_id,
        )
        .first()
    )
    if not exists:
        raise HTTPException(403, "Você não leciona esta matéria nesta turma")


@router.get("", response_model=List[ExamListOut])
def list_exams(
    subject_id: Optional[int] = Query(None),
    class_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Exam)
        .join(Subject)
        .filter(Subject.institution_id == current_user.institution_id)
        .options(
            joinedload(Exam.subject),
            joinedload(Exam.class_),
            joinedload(Exam.professor),
        )
    )
    if current_user.role == UserRole.PROFESSOR:
        q = q.filter(Exam.professor_id == current_user.id)
    elif current_user.role == UserRole.STUDENT:
        # Aluno só vê provas das turmas em que está matriculado
        enrolled_class_ids = (
            db.query(StudentClass.class_id)
            .filter(StudentClass.student_id == current_user.id)
            .subquery()
        )
        q = q.filter(Exam.class_id.in_(enrolled_class_ids))
    if subject_id:
        q = q.filter(Exam.subject_id == subject_id)
    if class_id:
        q = q.filter(Exam.class_id == class_id)

    # Count questions per exam in one query instead of N lazy loads
    counts = dict(
        db.query(ExamQuestion.exam_id, func.count(ExamQuestion.id))
        .filter(ExamQuestion.exam_id.in_(db.query(Exam.id).join(Subject).filter(Subject.institution_id == current_user.institution_id)))
        .group_by(ExamQuestion.exam_id)
        .all()
    )

    result = []
    for exam in q.all():
        item = ExamListOut.model_validate(exam)
        item.question_count = counts.get(exam.id, 0)
        result.append(item)
    return result


@router.post("", response_model=ExamOut, status_code=201)
def create_exam(
    payload: ExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")
    class_ = db.get(Class, payload.class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")

    if current_user.role == UserRole.PROFESSOR:
        _assert_professor_teaches(db, current_user.id, payload.subject_id, payload.class_id)

    exam = Exam(
        title=payload.title,
        instructions=payload.instructions,
        professor_id=current_user.id,
        subject_id=payload.subject_id,
        class_id=payload.class_id,
    )
    db.add(exam)
    db.flush()

    for eq in payload.questions:
        question = db.get(Question, eq.question_id)
        if not question:
            raise HTTPException(404, f"Questão {eq.question_id} não encontrada")
        # validate access
        q_subject = db.get(Subject, question.subject_id)
        if q_subject.institution_id != current_user.institution_id:
            raise HTTPException(403, f"Questão {eq.question_id} sem acesso")
        if (
            current_user.role == UserRole.PROFESSOR
            and not question.is_public
            and question.professor_id != current_user.id
        ):
            raise HTTPException(403, f"Questão {eq.question_id} é privada de outro professor")
        db.add(ExamQuestion(exam_id=exam.id, question_id=eq.question_id, order=eq.order, points=eq.points))

    db.commit()
    db.refresh(exam)
    return exam


@router.post("/redacao", response_model=ExamOut, status_code=201)
def create_exam_redacao(
    payload: ExamCreateRedacao,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    """Cria uma avaliação de redação: gera automaticamente uma questão essay
    com o enunciado/instruções fornecidos e monta a prova com ela."""
    # Verificar acesso ao CAR
    institution = db.get(Institution, current_user.institution_id)
    if not institution or not institution.car_enabled:
        raise HTTPException(403, "O módulo CAR não está ativo para esta instituição.")
    if current_user.role == UserRole.PROFESSOR and not current_user.car_access:
        raise HTTPException(403, "Você não tem acesso ao módulo CAR.")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.institution_id != current_user.institution_id:
        raise HTTPException(404, "Matéria não encontrada")
    class_ = db.get(Class, payload.class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")

    if current_user.role == UserRole.PROFESSOR:
        _assert_professor_teaches(db, current_user.id, payload.subject_id, payload.class_id)

    # Criar questão essay automaticamente
    question = Question(
        statement=payload.enunciado,
        question_type=QuestionType.ESSAY,
        is_public=False,
        difficulty="medium",
        criteria=payload.criteria,
        subject_id=payload.subject_id,
        professor_id=current_user.id,
    )
    db.add(question)
    db.flush()

    # instructions não recebe o enunciado: ele já fica em question.statement (fonte
    # única) e é exibido a partir de lá em todas as telas e no PDF. Duplicar aqui
    # arriscava dessincronizar os dois textos quando a prova fosse editada depois.
    exam = Exam(
        title=payload.title,
        professor_id=current_user.id,
        subject_id=payload.subject_id,
        class_id=payload.class_id,
    )
    db.add(exam)
    db.flush()

    db.add(ExamQuestion(exam_id=exam.id, question_id=question.id, order=0, points=payload.points))

    db.commit()
    db.refresh(exam)
    return exam


@router.get("/{exam_id}", response_model=ExamOut)
def get_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exam = db.get(Exam, exam_id)
    _assert_exam_view_access(db, exam, current_user)
    return exam


@router.put("/{exam_id}", response_model=ExamOut)
def update_exam(
    exam_id: int,
    payload: ExamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    exam = db.get(Exam, exam_id)
    _assert_exam_manage_access(db, exam, current_user)

    if payload.title:
        exam.title = payload.title
    if payload.instructions is not None:
        exam.instructions = payload.instructions

    if payload.questions is not None:
        for eq in exam.exam_questions:
            db.delete(eq)
        db.flush()
        for eq in payload.questions:
            question = db.get(Question, eq.question_id)
            if not question:
                raise HTTPException(404, f"Questão {eq.question_id} não encontrada")
            db.add(ExamQuestion(exam_id=exam.id, question_id=eq.question_id, order=eq.order, points=eq.points))

    db.commit()
    db.refresh(exam)
    return exam


@router.post("/{exam_id}/apply", response_model=ExamOut, status_code=201)
def apply_exam(
    exam_id: int,
    payload: ExamApply,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    exam = db.get(Exam, exam_id)
    _assert_exam_manage_access(db, exam, current_user)

    class_ = db.get(Class, payload.class_id)
    if not class_ or class_.institution_id != current_user.institution_id:
        raise HTTPException(404, "Turma não encontrada")
    if current_user.role == UserRole.PROFESSOR:
        _assert_professor_teaches(db, current_user.id, exam.subject_id, payload.class_id)

    questions = list(exam.exam_questions)

    new_exam = Exam(
        title=exam.title,
        instructions=exam.instructions,
        professor_id=current_user.id,
        subject_id=exam.subject_id,
        class_id=payload.class_id,
    )
    db.add(new_exam)
    db.flush()

    for eq in questions:
        db.add(ExamQuestion(exam_id=new_exam.id, question_id=eq.question_id, order=eq.order, points=eq.points))

    db.commit()
    db.refresh(new_exam)
    return new_exam


@router.delete("/{exam_id}", status_code=204)
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    exam = db.get(Exam, exam_id)
    _assert_exam_manage_access(db, exam, current_user)
    db.delete(exam)
    db.commit()


def _html_to_rl(html_text: str) -> str:
    """Convert TipTap HTML to ReportLab Paragraph XML markup."""
    if not html_text or "<" not in html_text:
        return html_text or ""

    class _Conv(HTMLParser):
        def __init__(self):
            super().__init__()
            self.out: list[str] = []
            self._font_open: list[bool] = []

        def handle_starttag(self, tag, attrs):
            a = dict(attrs)
            if tag in ("b", "strong"):
                self.out.append("<b>")
            elif tag in ("i", "em"):
                self.out.append("<i>")
            elif tag == "u":
                self.out.append("<u>")
            elif tag == "strike":
                self.out.append("<strike>")
            elif tag == "br":
                self.out.append("<br/>")
            elif tag == "span":
                style = a.get("style", "")
                color = self._color(style)
                if color:
                    self.out.append(f'<font color="{color}">')
                    self._font_open.append(True)
                else:
                    self._font_open.append(False)
            elif tag == "p":
                pass  # newline added on close

        def handle_endtag(self, tag):
            if tag in ("b", "strong"):
                self.out.append("</b>")
            elif tag in ("i", "em"):
                self.out.append("</i>")
            elif tag == "u":
                self.out.append("</u>")
            elif tag == "strike":
                self.out.append("</strike>")
            elif tag == "span":
                if self._font_open and self._font_open.pop():
                    self.out.append("</font>")
            elif tag == "p":
                self.out.append("<br/>")

        def handle_data(self, data):
            data = data.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            self.out.append(data)

        def handle_entityref(self, name):
            self.out.append(f"&{name};")

        def handle_charref(self, name):
            self.out.append(f"&#{name};")

        @staticmethod
        def _color(style: str) -> str:
            m = re.search(r"color:\s*(#[0-9a-fA-F]{3,8})", style)
            if m:
                return m.group(1)
            m = re.search(r"color:\s*rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)", style)
            if m:
                r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
                return f"#{r:02X}{g:02X}{b:02X}"
            return ""

    conv = _Conv()
    conv.feed(html_text)
    result = "".join(conv.out)
    result = re.sub(r"(<br/>\s*)+$", "", result).strip()
    return result or html_text


def _build_exam_pdf(exam: Exam, student: Optional[User], student_id: Optional[int]) -> io.BytesIO:
    import base64

    import qrcode as _qrcode
    import qrcode.image.pil as _qrpil

    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        HRFlowable,
        Image,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    from app.utils.shuffle import seeded_shuffle

    subject = exam.subject
    institution = exam.subject.institution
    page_w, page_h = A4
    margin = 2 * cm
    content_w = page_w - 2 * margin
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=margin, rightMargin=margin,
        topMargin=margin, bottomMargin=margin,
    )
    styles = getSampleStyleSheet()
    story = []

    # ── Cabeçalho ─────────────────────────────────────────────────────────────
    school_style = ParagraphStyle(
        "school", fontSize=16, fontName="Helvetica-Bold",
        alignment=1, spaceAfter=2,
    )
    subject_style = ParagraphStyle(
        "subject", fontSize=11, fontName="Helvetica",
        alignment=1, spaceAfter=2, textColor=colors.HexColor("#444444"),
    )
    title_style = ParagraphStyle(
        "title", fontSize=13, fontName="Helvetica-Bold",
        alignment=1, spaceAfter=4,
    )
    info_style = ParagraphStyle(
        "info", fontSize=9, fontName="Helvetica",
        alignment=1, textColor=colors.HexColor("#555555"),
    )

    logo_img = None
    if institution and institution.logo:
        try:
            header, b64data = institution.logo.split(",", 1)
            img_bytes = base64.b64decode(b64data)
            logo_buf = io.BytesIO(img_bytes)
            logo_img = Image(logo_buf, width=3 * cm, height=3 * cm)
            logo_img.hAlign = "LEFT"
        except Exception:
            logo_img = None

    school_name = institution.name if institution else ""

    if logo_img:
        header_data = [[
            logo_img,
            [
                Paragraph(school_name, school_style),
                Paragraph(subject.name, subject_style),
                Paragraph(exam.title, title_style),
                Paragraph(
                    f"Professor: {exam.professor.name} &nbsp;|&nbsp; "
                    f"Turma: {exam.class_.name} — {exam.class_.year}",
                    info_style,
                ),
            ],
        ]]
        header_table = Table(header_data, colWidths=[3.5 * cm, content_w - 3.5 * cm])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (0, 0), 0),
            ("RIGHTPADDING", (0, 0), (0, 0), 6),
        ]))
        story.append(header_table)
    else:
        story.append(Paragraph(school_name, school_style))
        story.append(Paragraph(subject.name, subject_style))
        story.append(Paragraph(exam.title, title_style))
        story.append(Paragraph(
            f"Professor: {exam.professor.name} &nbsp;|&nbsp; "
            f"Turma: {exam.class_.name} — {exam.class_.year}",
            info_style,
        ))

    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1d4ed8")))
    story.append(Spacer(1, 0.4 * cm))

    # ── Linha de identificação do aluno + caixa de nota ───────────────────────
    field_style = ParagraphStyle("field", fontSize=9, fontName="Helvetica", leading=14)

    name_text = f"Nome: {student.name}" if student else "Nome: _______________________________________________________"
    nota_inner = Table(
        [[Paragraph("<b>NOTA</b>", ParagraphStyle("nota_lbl", fontSize=8, fontName="Helvetica-Bold", alignment=1))],
         [Paragraph("", field_style)]],
        colWidths=[2.8 * cm],
        rowHeights=[0.5 * cm, 1.2 * cm],
        style=TableStyle([
            ("BOX", (0, 0), (-1, -1), 1.2, colors.black),
            ("LINEBELOW", (0, 0), (0, 0), 0.5, colors.black),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]),
    )

    if student_id:
        qr_size_pt = 1.8 * cm
        _qr = _qrcode.QRCode(box_size=6, border=1)
        _qr.add_data(f"EXAM:{exam.id}:STUDENT:{student_id}")
        _qr.make(fit=True)
        _qr_pil = _qr.make_image(image_factory=_qrpil.PilImage, fill_color="black", back_color="white")
        _qr_buf = io.BytesIO()
        _qr_pil.get_image().save(_qr_buf, format="PNG")
        _qr_buf.seek(0)
        qr_img = Image(_qr_buf, width=qr_size_pt, height=qr_size_pt)
        qr_img.hAlign = "RIGHT"
        remaining = content_w - 3 * cm - qr_size_pt - 4
        id_data = [[
            Paragraph(name_text, field_style),
            Paragraph("Data: ___/___/______", field_style),
            nota_inner,
            qr_img,
        ]]
        id_col_widths = [remaining * 0.70, remaining * 0.30, 3 * cm, qr_size_pt + 4]
    else:
        remaining = content_w - 3 * cm
        id_data = [[
            Paragraph(name_text, field_style),
            Paragraph("Data: ___/___/______", field_style),
            nota_inner,
        ]]
        id_col_widths = [remaining * 0.70, remaining * 0.30, 3 * cm]

    id_table = Table(
        id_data,
        colWidths=id_col_widths,
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]),
    )
    story.append(id_table)
    story.append(Spacer(1, 0.35 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc")))
    story.append(Spacer(1, 0.4 * cm))

    # ── Instruções ────────────────────────────────────────────────────────────
    if exam.instructions:
        instr_style = ParagraphStyle(
            "instr", fontSize=9, fontName="Helvetica-Oblique",
            leftIndent=6, borderPad=4,
        )
        story.append(Paragraph(f"<b>Instruções:</b> {exam.instructions}", instr_style))
        story.append(Spacer(1, 0.4 * cm))

    # ── Questões ──────────────────────────────────────────────────────────────
    q_num_style = ParagraphStyle(
        "qnum", fontSize=10, fontName="Helvetica-Bold", spaceAfter=3,
    )
    q_text_style = ParagraphStyle(
        "qtext", fontSize=10, fontName="Helvetica", spaceAfter=4, leading=14,
    )
    opt_style = ParagraphStyle(
        "opt", fontSize=9, fontName="Helvetica", leftIndent=12, spaceAfter=2, leading=13,
    )

    LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    if student_id:
        seed = student_id * 1_000_003 + exam.id
        questions_to_render = seeded_shuffle(list(exam.exam_questions), seed)
    else:
        questions_to_render = list(exam.exam_questions)

    for i, eq in enumerate(questions_to_render, 1):
        q = eq.question
        pts_label = f"{eq.points:g} pt{'s' if eq.points != 1 else ''}"
        stmt_clean, source = _extract_source(q.statement)
        header = f"Questão {i} <font size='8' color='#555555'>({pts_label})</font>"
        if source:
            header += (
                f" &nbsp;<font size='7' color='#5b21b6'>"
                f"[Fonte: {source}]</font>"
            )
        story.append(Paragraph(header, q_num_style))
        story.append(Paragraph(_html_to_rl(stmt_clean), q_text_style))

        if q.image_base64:
            try:
                b64_data = q.image_base64
                if "," in b64_data:
                    b64_data = b64_data.split(",", 1)[1]
                img_bytes = base64.b64decode(b64_data)
                img_buf = io.BytesIO(img_bytes)
                from PIL import Image as _PILImage
                with _PILImage.open(io.BytesIO(img_bytes)) as _pil:
                    orig_w, orig_h = _pil.size
                max_w = content_w * 0.7
                max_h = 6 * cm
                scale = min(max_w / orig_w, max_h / orig_h, 1.0)
                img_buf.seek(0)
                story.append(Spacer(1, 0.1 * cm))
                story.append(Image(img_buf, width=orig_w * scale, height=orig_h * scale))
                story.append(Spacer(1, 0.2 * cm))
            except Exception:
                pass

        if q.options:
            if student_id:
                opts_to_render = seeded_shuffle(sorted(q.options, key=lambda o: o.order), seed + eq.id)
            else:
                opts_to_render = sorted(q.options, key=lambda o: o.order)
            for j, opt in enumerate(opts_to_render):
                letter = LETTERS[j] if j < len(LETTERS) else str(j + 1)
                story.append(Paragraph(f"( &nbsp;) &nbsp;<b>{letter})</b> {opt.text}", opt_style))
            story.append(Spacer(1, 0.3 * cm))
        elif q.question_type == "essay":
            from reportlab.lib import colors as _colors
            from reportlab.platypus import HRFlowable as _HRF
            for _ in range(4):
                story.append(_HRF(
                    width="100%", thickness=0.4,
                    color=_colors.HexColor("#bbbbbb"), spaceAfter=0.55 * cm,
                ))
            story.append(Spacer(1, 0.2 * cm))

        story.append(Spacer(1, 0.2 * cm))

    doc.build(story)
    buffer.seek(0)
    return buffer


@router.get("/{exam_id}/pdf")
def export_exam_pdf(
    exam_id: int,
    student_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exam = db.get(Exam, exam_id)
    _assert_exam_view_access(db, exam, current_user)

    if current_user.role == UserRole.STUDENT:
        # Students may only download their own copy, never another student's.
        student_id = current_user.id

    student = None
    if student_id:
        student = db.get(User, student_id)
        if not student or student.institution_id != current_user.institution_id:
            raise HTTPException(404, "Aluno não encontrado")

    buffer = _build_exam_pdf(exam, student, student_id)
    import unicodedata as _ud
    _ascii = _ud.normalize("NFKD", exam.title).encode("ascii", "ignore").decode("ascii")
    safe_title = re.sub(r"[^a-zA-Z0-9\-]", "_", _ascii)[:40].strip("_") or "prova"
    filename = f"prova_{safe_title}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{exam_id}/pdf/bulk")
def export_exam_pdf_bulk(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
):
    exam = db.get(Exam, exam_id)
    _assert_exam_manage_access(db, exam, current_user)

    students = (
        db.query(User)
        .join(StudentClass, StudentClass.student_id == User.id)
        .filter(StudentClass.class_id == exam.class_id)
        .order_by(User.name)
        .all()
    )
    if not students:
        raise HTTPException(404, "Nenhum aluno matriculado nesta turma")

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for student in students:
            pdf_buf = _build_exam_pdf(exam, student, student.id)
            safe_name = student.name.replace(" ", "_")[:40]
            zf.writestr(f"{safe_name}.pdf", pdf_buf.getvalue())

    zip_buf.seek(0)
    import unicodedata as _ud
    _ascii = _ud.normalize("NFKD", exam.title).encode("ascii", "ignore").decode("ascii")
    safe_title = re.sub(r"[^a-zA-Z0-9\-]", "_", _ascii)[:40].strip("_") or "prova"
    filename = f"provas_{safe_title}.zip"
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
