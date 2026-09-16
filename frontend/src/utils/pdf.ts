import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Class, Exam, Question, Subject, TeachingAssignment, User } from '../types'
import type { Submission, SubmissionList } from '../types/submission'
import type { DashboardStats } from '../api'

export function stripHtml(html: string): string {
  if (!html || !html.includes('<')) return html
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim()
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY   = [0, 35, 111]   as [number, number, number]
const PURPLE = [107, 56, 212] as [number, number, number]
const GREEN  = [39, 195, 138] as [number, number, number]
const AMBER  = [217, 119, 6]  as [number, number, number]
const RED    = [220, 38, 38]  as [number, number, number]
const GRAY   = [117, 118, 130] as [number, number, number]
const LIGHT  = [245, 246, 255] as [number, number, number]
const WHITE  = [255, 255, 255] as [number, number, number]

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando', correcting: 'Corrigindo',
  done: 'Corrigido', released: 'Liberado', not_submitted: 'Não entregou',
}
const DIFF_LABEL: Record<string, string> = {
  easy: 'Fácil', medium: 'Médio', hard: 'Difícil',
}
const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Múltipla Escolha', true_false: 'V / F', essay: 'Dissertativa',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function today(): string {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// ─── Shared page elements ────────────────────────────────────────────────────
function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 30, 'F')
  // accent strip
  doc.setFillColor(...PURPLE)
  doc.rect(0, 30, W, 2, 'F')

  // brand
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...WHITE)
  doc.text('PLATAFORMA DE AVALIAÇÕES', 14, 10)

  // title
  doc.setFontSize(16)
  doc.text(title, 14, 22)

  // subtitle
  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(200, 215, 255)
    doc.text(subtitle, 14, 28)
  }

  // date top-right
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(200, 215, 255)
  doc.text(today(), W - 14, 10, { align: 'right' })
}

function addPageFooter(doc: jsPDF, page: number, total: number) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  doc.setFillColor(...LIGHT)
  doc.rect(0, H - 10, W, 10, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text('Relatório gerado automaticamente — Plataforma de Avaliações', 14, H - 3)
  doc.text(`Página ${page} de ${total}`, W - 14, H - 3, { align: 'right' })
}

function applyFooters(doc: jsPDF) {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    addPageFooter(doc, i, total)
  }
}

function lastY(doc: jsPDF): number {
  return (doc as any).lastAutoTable?.finalY ?? 38
}

// Renders a row of info boxes (label + value) below the header
function addInfoRow(doc: jsPDF, items: { label: string; value: string; color?: [number,number,number] }[], y: number): number {
  const W = doc.internal.pageSize.getWidth()
  const boxW = (W - 28 - (items.length - 1) * 4) / items.length
  items.forEach((item, i) => {
    const x = 14 + i * (boxW + 4)
    doc.setFillColor(...LIGHT)
    doc.roundedRect(x, y, boxW, 14, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text(item.label.toUpperCase(), x + 4, y + 5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...(item.color ?? NAVY))
    doc.text(item.value, x + 4, y + 12)
  })
  return y + 18
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...NAVY)
  doc.rect(14, y, 3, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...NAVY)
  doc.text(title, 20, y + 5)
  return y + 10
}

// Common table styles
const HEAD_STYLE = { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold' as const, fontSize: 9 }
const BODY_STYLE = { fontSize: 8.5, textColor: [30, 30, 30] as [number, number, number] }
const ALT_STYLE  = { fillColor: LIGHT }
const TABLE_MARGIN = { left: 14, right: 14 }

// ─── 1. Professores ───────────────────────────────────────────────────────────
export function exportProfessors(
  professors: User[],
  assignments: TeachingAssignment[],
  filterLabel: string,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  addHeader(doc, 'Relatório de Professores', filterLabel)

  const active   = professors.filter(p => p.is_active).length
  const inactive = professors.length - active

  let y = addInfoRow(doc, [
    { label: 'Total', value: String(professors.length), color: NAVY },
    { label: 'Ativos', value: String(active), color: GREEN },
    { label: 'Inativos', value: String(inactive), color: GRAY },
  ], 36)

  y = addSectionTitle(doc, 'Lista de Professores', y + 2)

  const rows = professors.map(p => {
    const asgn = assignments.filter(a => a.professor_id === p.id)
    const materias = [...new Set(asgn.map(a => a.subject?.name).filter(Boolean))].join(', ') || '—'
    const turmas   = [...new Set(asgn.map(a => a.class_?.name).filter(Boolean))].join(', ') || '—'
    return [
      p.name,
      p.email,
      materias,
      turmas,
      p.is_active ? 'Ativo' : 'Inativo',
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [['Nome', 'E-mail', 'Matérias', 'Turmas', 'Status']],
    body: rows,
    styles: BODY_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TABLE_MARGIN,
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 48 },
      4: { cellWidth: 18, halign: 'center' },
    },
  })

  applyFooters(doc)
  doc.save(`professores-${slug(filterLabel)}.pdf`)
}

// ─── 2. Alunos ────────────────────────────────────────────────────────────────
export function exportStudents(students: User[], filterLabel: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  addHeader(doc, 'Relatório de Alunos', filterLabel)

  const active   = students.filter(s => s.is_active).length
  const inactive = students.length - active

  let y = addInfoRow(doc, [
    { label: 'Total', value: String(students.length), color: NAVY },
    { label: 'Ativos', value: String(active), color: GREEN },
    { label: 'Inativos', value: String(inactive), color: GRAY },
  ], 36)

  y = addSectionTitle(doc, 'Lista de Alunos', y + 2)

  autoTable(doc, {
    startY: y,
    head: [['#', 'Nome', 'E-mail', 'Status']],
    body: students.map((s, i) => [
      i + 1,
      s.name,
      s.email,
      s.is_active ? 'Ativo' : 'Inativo',
    ]),
    styles: BODY_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TABLE_MARGIN,
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
    },
  })

  applyFooters(doc)
  doc.save(`alunos-${slug(filterLabel)}.pdf`)
}

// ─── 3. Provas ────────────────────────────────────────────────────────────────
export function exportExams(exams: Exam[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  addHeader(doc, 'Relatório de Provas', `${exams.length} prova${exams.length !== 1 ? 's' : ''} no período`)

  const totalQ = exams.reduce((s, e) => s + (e.exam_questions?.length ?? e.question_count ?? 0), 0)

  let y = addInfoRow(doc, [
    { label: 'Total de Provas', value: String(exams.length), color: NAVY },
    { label: 'Total de Questões', value: String(totalQ), color: PURPLE },
  ], 36)

  y = addSectionTitle(doc, 'Lista de Provas', y + 2)

  autoTable(doc, {
    startY: y,
    head: [['Título', 'Matéria', 'Turma', 'Professor', 'Questões', 'Criada em']],
    body: exams.map(e => [
      e.title,
      e.subject?.name ?? '—',
      `${e.class_?.name ?? '—'} ${e.class_?.year ? `(${e.class_.year})` : ''}`.trim(),
      e.professor?.name ?? '—',
      e.exam_questions?.length ?? e.question_count ?? 0,
      fmtDate(e.created_at),
    ]),
    styles: BODY_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TABLE_MARGIN,
    columnStyles: {
      0: { cellWidth: 70 },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 26, halign: 'center' },
    },
  })

  applyFooters(doc)
  doc.save(`provas.pdf`)
}

// ─── 4. Submissões / Notas por prova ─────────────────────────────────────────
export function exportSubmissions(
  exam: Exam,
  submissions: SubmissionList[],
  enrolled: User[],
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const totalPoints = exam.exam_questions?.reduce((s, q) => s + q.points, 0) ?? 0
  addHeader(doc, 'Relatório de Notas', exam.title)

  const submitted = submissions.length
  const corrected = submissions.filter(s => ['done','released'].includes(s.status as string)).length
  const avg = submissions.filter(s => s.total_score != null).length > 0
    ? (submissions.reduce((s, sub) => s + (sub.total_score ?? 0), 0) / submissions.filter(s => s.total_score != null).length).toFixed(1)
    : '—'

  let y = addInfoRow(doc, [
    { label: 'Matéria', value: exam.subject?.name ?? '—', color: NAVY },
    { label: 'Turma', value: exam.class_?.name ?? '—', color: NAVY },
    { label: 'Matriculados', value: String(enrolled.length), color: NAVY },
    { label: 'Submeteram', value: String(submitted), color: PURPLE },
    { label: 'Corrigidos', value: String(corrected), color: GREEN },
    { label: 'Média', value: avg !== '—' ? `${avg} / ${totalPoints}` : '—', color: PURPLE },
  ], 36)

  y = addSectionTitle(doc, 'Notas por Aluno', y + 2)

  // Merge enrolled with submissions
  const rows = enrolled.map(student => {
    const sub = submissions.find(s => s.student_id === student.id)
    if (!sub) return [student.name, student.email, '—', 'Não entregou', '—']
    const scoreStr = sub.total_score != null ? `${sub.total_score} / ${totalPoints}` : '—'
    return [
      student.name,
      student.email,
      fmtDateTime(sub.submitted_at),
      STATUS_LABEL[sub.status] ?? sub.status,
      scoreStr,
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [['Aluno', 'E-mail', 'Entregue em', 'Status', 'Nota']],
    body: rows,
    styles: BODY_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TABLE_MARGIN,
    columnStyles: {
      2: { cellWidth: 34, halign: 'center' },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' },
    },
  })

  applyFooters(doc)
  doc.save(`notas-${slug(exam.title)}.pdf`)
}

// ─── 5. Correções (gerencial) ─────────────────────────────────────────────────
export function exportCorrections(
  classes: Class[],
  examsByClass: Record<number, Exam[]>,
  submissionsByExam: Record<number, SubmissionList[]>,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  addHeader(doc, 'Relatório de Correções', 'Visão geral de todas as turmas')

  // Summary counts
  let totalSubs = 0, totalCorrected = 0, totalReleased = 0
  Object.values(submissionsByExam).forEach(subs => {
    totalSubs += subs.length
    totalCorrected += subs.filter(s => ['done','released'].includes(s.status as string)).length
    totalReleased  += subs.filter(s => (s.status as string) === 'released').length
  })

  let y = addInfoRow(doc, [
    { label: 'Turmas', value: String(classes.length), color: NAVY },
    { label: 'Total de Submissões', value: String(totalSubs), color: NAVY },
    { label: 'Corrigidas', value: String(totalCorrected), color: GREEN },
    { label: 'Notas Liberadas', value: String(totalReleased), color: PURPLE },
  ], 36)

  classes.forEach(cls => {
    const exams = examsByClass[cls.id] ?? []
    if (!exams.length) return

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...NAVY)
    y = addSectionTitle(doc, `Turma: ${cls.name} ${cls.year ? `(${cls.year})` : ''}`, y + 3)

    const rows: (string | number)[][] = []
    exams.forEach(exam => {
      const subs = submissionsByExam[exam.id] ?? []
      subs.forEach(sub => {
        rows.push([
          exam.title,
          exam.subject?.name ?? '—',
          sub.student?.name ?? `Aluno #${sub.student_id}`,
          fmtDateTime(sub.submitted_at),
          STATUS_LABEL[sub.status as string] ?? sub.status,
          sub.total_score != null ? String(sub.total_score) : '—',
        ])
      })
      if (!subs.length) {
        rows.push([exam.title, exam.subject?.name ?? '—', '(sem submissões)', '', '', ''])
      }
    })

    autoTable(doc, {
      startY: y,
      head: [['Prova', 'Matéria', 'Aluno', 'Entregue em', 'Status', 'Nota']],
      body: rows,
      styles: BODY_STYLE,
      headStyles: { ...HEAD_STYLE, fillColor: PURPLE },
      alternateRowStyles: ALT_STYLE,
      margin: TABLE_MARGIN,
      columnStyles: {
        3: { cellWidth: 32, halign: 'center' },
        4: { cellWidth: 26, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
      },
    })
    y = lastY(doc) + 6

    if (y > 170) { doc.addPage(); y = 14 }
  })

  applyFooters(doc)
  doc.save('correcoes.pdf')
}

// ─── 6. Banco de Questões ────────────────────────────────────────────────────
export function exportQuestions(questions: Question[], filterDesc: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  addHeader(doc, 'Banco de Questões', filterDesc)

  const byType: Record<string, number> = {}
  const byDiff: Record<string, number> = {}
  questions.forEach(q => {
    byType[q.question_type] = (byType[q.question_type] ?? 0) + 1
    if (q.difficulty) byDiff[q.difficulty] = (byDiff[q.difficulty] ?? 0) + 1
  })

  let y = addInfoRow(doc, [
    { label: 'Total', value: String(questions.length), color: NAVY },
    { label: 'Múltipla Escolha', value: String(byType.multiple_choice ?? 0), color: PURPLE },
    { label: 'V / F', value: String(byType.true_false ?? 0), color: NAVY },
    { label: 'Dissertativa', value: String(byType.essay ?? 0), color: NAVY },
    { label: 'Fácil', value: String(byDiff.easy ?? 0), color: GREEN },
    { label: 'Médio', value: String(byDiff.medium ?? 0), color: AMBER },
    { label: 'Difícil', value: String(byDiff.hard ?? 0), color: RED },
  ], 36)

  y = addSectionTitle(doc, 'Lista de Questões', y + 2)

  autoTable(doc, {
    startY: y,
    head: [['#', 'Enunciado', 'Tipo', 'Dificuldade', 'Matéria', 'Professor']],
    body: questions.map((q, i) => [
      i + 1,
      (() => { const s = stripHtml(q.statement); return s.length > 90 ? s.slice(0, 87) + '...' : s })(),
      TYPE_LABEL[q.question_type] ?? q.question_type,
      DIFF_LABEL[q.difficulty ?? ''] ?? q.difficulty ?? '—',
      q.subject?.name ?? '—',
      q.professor?.name ?? '—',
    ]),
    styles: BODY_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TABLE_MARGIN,
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 90 },
      2: { cellWidth: 32, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
    },
  })

  applyFooters(doc)
  doc.save(`questoes-${slug(filterDesc)}.pdf`)
}

// ─── 7. Turmas ───────────────────────────────────────────────────────────────
export function exportClasses(classes: Class[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  addHeader(doc, 'Relatório de Turmas', `${classes.length} turma${classes.length !== 1 ? 's' : ''} cadastrada${classes.length !== 1 ? 's' : ''}`)

  let y = addInfoRow(doc, [
    { label: 'Total de Turmas', value: String(classes.length), color: NAVY },
  ], 36)

  y = addSectionTitle(doc, 'Lista de Turmas', y + 2)

  autoTable(doc, {
    startY: y,
    head: [['#', 'Nome da Turma', 'Ano Letivo']],
    body: classes.map((c, i) => [i + 1, c.name, c.year ?? '—']),
    styles: BODY_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TABLE_MARGIN,
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 28, halign: 'center' },
    },
  })

  applyFooters(doc)
  doc.save('turmas.pdf')
}

// ─── 8. Matérias ──────────────────────────────────────────────────────────────
export function exportSubjects(subjects: Subject[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  addHeader(doc, 'Relatório de Matérias', `${subjects.length} matéria${subjects.length !== 1 ? 's' : ''} cadastrada${subjects.length !== 1 ? 's' : ''}`)

  let y = addInfoRow(doc, [
    { label: 'Total de Matérias', value: String(subjects.length), color: NAVY },
  ], 36)

  y = addSectionTitle(doc, 'Lista de Matérias', y + 2)

  autoTable(doc, {
    startY: y,
    head: [['#', 'Nome da Matéria']],
    body: subjects.map((s, i) => [i + 1, s.name]),
    styles: BODY_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TABLE_MARGIN,
    columnStyles: { 0: { cellWidth: 12, halign: 'center' } },
  })

  applyFooters(doc)
  doc.save('materias.pdf')
}

// ─── 9. Analytics da Prova ───────────────────────────────────────────────────
interface Analytics {
  exam_id: number; exam_title: string; total_points: number
  total_enrolled: number; total_submitted: number; corrected_count: number
  average_score: number | null; median_score: number | null
  highest_score: number | null; lowest_score: number | null
  std_dev: number; pass_rate: number
  score_distribution: { label: string; count: number }[]
  question_stats: {
    exam_question_id: number; order: number; statement: string
    question_type: string; points: number
    correct_count: number; wrong_count: number; skip_count: number
    avg_score: number | null; error_rate: number
  }[]
  plagiarism_alerts: {
    student_a: { id: number; name: string }
    student_b: { id: number; name: string }
    type: string; similarity: number; evidence: string
  }[]
}

export function exportAnalytics(data: Analytics) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  addHeader(doc, 'Análise de Prova', data.exam_title)

  let y = addInfoRow(doc, [
    { label: 'Matriculados', value: String(data.total_enrolled), color: NAVY },
    { label: 'Submeteram', value: String(data.total_submitted), color: PURPLE },
    { label: 'Corrigidos', value: String(data.corrected_count), color: GREEN },
    { label: 'Média', value: data.average_score != null ? `${data.average_score} / ${data.total_points}` : '—', color: NAVY },
    { label: 'Mediana', value: data.median_score != null ? String(data.median_score) : '—', color: NAVY },
    { label: 'Aprovação', value: `${data.pass_rate}%`, color: data.pass_rate >= 50 ? GREEN : RED },
  ], 36)

  // Score range
  let y2 = addInfoRow(doc, [
    { label: 'Maior Nota', value: data.highest_score != null ? String(data.highest_score) : '—', color: GREEN },
    { label: 'Menor Nota', value: data.lowest_score != null ? String(data.lowest_score) : '—', color: RED },
    { label: 'Desvio Padrão', value: String(data.std_dev), color: GRAY },
  ], y)

  y = y2 + 4

  // Distribution
  y = addSectionTitle(doc, 'Distribuição de Notas', y)
  autoTable(doc, {
    startY: y,
    head: [['Faixa', 'Quantidade de Alunos']],
    body: data.score_distribution.map(b => [b.label, b.count]),
    styles: BODY_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TABLE_MARGIN,
    tableWidth: 100,
    columnStyles: { 1: { halign: 'center', cellWidth: 40 } },
  })

  y = lastY(doc) + 8

  // Question stats
  if (y > 170) { doc.addPage(); y = 14 }
  y = addSectionTitle(doc, 'Desempenho por Questão', y)
  autoTable(doc, {
    startY: y,
    head: [['Q#', 'Enunciado', 'Tipo', 'Pts', 'Acertos', 'Erros', 'Pularam', 'Taxa de Erro']],
    body: data.question_stats.map(q => [
      `Q${q.order}`,
      (() => { const s = stripHtml(q.statement); return s.length > 60 ? s.slice(0, 57) + '...' : s })(),
      TYPE_LABEL[q.question_type] ?? q.question_type,
      q.points,
      q.correct_count,
      q.wrong_count,
      q.skip_count,
      `${Math.round(q.error_rate * 100)}%`,
    ]),
    styles: BODY_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TABLE_MARGIN,
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 22, halign: 'center' },
    },
  })

  // Plagiarism
  if (data.plagiarism_alerts.length > 0) {
    y = lastY(doc) + 8
    if (y > 170) { doc.addPage(); y = 14 }
    y = addSectionTitle(doc, '⚠ Alertas de Similaridade', y)
    autoTable(doc, {
      startY: y,
      head: [['Aluno A', 'Aluno B', 'Tipo', 'Similaridade', 'Evidência']],
      body: data.plagiarism_alerts.map(a => [
        a.student_a.name,
        a.student_b.name,
        a.type === 'essay' ? 'Dissertativa' : 'Obj.',
        `${Math.round(a.similarity * 100)}%`,
        a.evidence.length > 60 ? a.evidence.slice(0, 57) + '...' : a.evidence,
      ]),
      styles: BODY_STYLE,
      headStyles: { ...HEAD_STYLE, fillColor: RED },
      alternateRowStyles: ALT_STYLE,
      margin: TABLE_MARGIN,
    })
  }

  applyFooters(doc)
  doc.save(`analytics-${slug(data.exam_title)}.pdf`)
}

// ─── 10. Resultado do Aluno ───────────────────────────────────────────────────
export function exportStudentResult(submission: Submission) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const examTitle = submission.answers[0]?.exam_question?.question?.subject?.name
    ? `Resultado — ${submission.answers[0]?.exam_question?.question?.subject?.name}`
    : 'Resultado da Prova'

  addHeader(doc, examTitle, `Aluno: ${submission.student?.name ?? '—'}`)

  const totalPossible = submission.answers.reduce((s, a) => s + (a.exam_question?.points ?? 0), 0)
  const pct = totalPossible > 0 && submission.total_score != null
    ? Math.round((submission.total_score / totalPossible) * 100)
    : 0

  let y = addInfoRow(doc, [
    { label: 'Nota Obtida', value: submission.total_score != null ? String(submission.total_score) : '—', color: pct >= 50 ? GREEN : RED },
    { label: 'Nota Possível', value: String(totalPossible), color: NAVY },
    { label: 'Aproveitamento', value: `${pct}%`, color: pct >= 50 ? GREEN : RED },
    { label: 'Questões', value: String(submission.answers.length), color: NAVY },
  ], 36)

  y = addSectionTitle(doc, 'Detalhamento por Questão', y + 2)

  autoTable(doc, {
    startY: y,
    head: [['Q#', 'Enunciado', 'Resposta', 'Pts Possíveis', 'Pts Obtidos', 'Resultado']],
    body: submission.answers.map((ans, i) => {
      const eq = ans.exam_question
      const q  = eq?.question
      const isCorrect = ans.score != null && ans.score >= (eq?.points ?? 0)
      const isPartial = ans.score != null && ans.score > 0 && ans.score < (eq?.points ?? 0)
      const resultado = isCorrect ? '✓ Correto' : isPartial ? '~ Parcial' : ans.score === 0 ? '✗ Errado' : '—'
      const resposta = ans.essay_text
        ? (ans.essay_text.length > 40 ? ans.essay_text.slice(0, 37) + '...' : ans.essay_text)
        : ans.selected_option_id ? 'Alternativa selecionada' : '(sem resposta)'
      return [
        `Q${i + 1}`,
        (() => { const s = stripHtml(q?.statement ?? '—'); return s.length > 55 ? s.slice(0, 52) + '...' : s })(),
        resposta,
        eq?.points ?? 0,
        ans.score != null ? ans.score : '—',
        resultado,
      ]
    }),
    styles: BODY_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TABLE_MARGIN,
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 22, halign: 'center' },
    },
  })

  applyFooters(doc)
  const studentName = slug(submission.student?.name ?? 'aluno')
  doc.save(`resultado-${studentName}.pdf`)
}

// ─── 11. Relatório Gerencial (Dashboard) ─────────────────────────────────────
export function exportDashboardReport(stats: DashboardStats, institutionName?: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  addHeader(doc, 'Relatório Gerencial', institutionName ?? 'Visão geral da instituição')

  const c = stats.counts
  const s = stats.submissions

  let y = addInfoRow(doc, [
    { label: 'Professores', value: String(c.professors), color: PURPLE },
    { label: 'Alunos', value: String(c.students), color: GREEN },
    { label: 'Matérias', value: String(c.subjects), color: AMBER },
    { label: 'Turmas', value: String(c.classes), color: NAVY },
    { label: 'Questões', value: String(c.questions), color: RED },
    { label: 'Provas', value: String(c.exams), color: NAVY },
  ], 36)

  // Submissions pipeline
  y = addSectionTitle(doc, 'Pipeline de Correções', y + 4)
  autoTable(doc, {
    startY: y,
    head: [['Total', 'Aguardando', 'Corrigindo', 'Corrigidos', 'Liberados']],
    body: [[s.total, s.pending, s.correcting, s.done, s.released]],
    styles: { ...BODY_STYLE, halign: 'center', fontSize: 10, fontStyle: 'bold' },
    headStyles: HEAD_STYLE,
    margin: TABLE_MARGIN,
    tableWidth: 150,
  })

  y = lastY(doc) + 8

  // Exams by subject
  if (stats.exams_by_subject?.length) {
    if (y > 155) { doc.addPage(); y = 14 }
    y = addSectionTitle(doc, 'Provas por Matéria', y)
    autoTable(doc, {
      startY: y,
      head: [['Matéria', 'Qtd. de Provas']],
      body: stats.exams_by_subject.map(r => [r.subject, r.count]),
      styles: BODY_STYLE,
      headStyles: HEAD_STYLE,
      alternateRowStyles: ALT_STYLE,
      margin: TABLE_MARGIN,
      tableWidth: 100,
      columnStyles: { 1: { halign: 'center', cellWidth: 30 } },
    })
    y = lastY(doc) + 8
  }

  // Difficulty breakdown
  const qd = stats.questions_by_difficulty ?? { easy: 0, medium: 0, hard: 0 }
  if (y > 155) { doc.addPage(); y = 14 }
  y = addSectionTitle(doc, 'Questões por Dificuldade', y)
  autoTable(doc, {
    startY: y,
    head: [['Dificuldade', 'Quantidade']],
    body: [
      ['Fácil',   qd.easy   ?? 0],
      ['Médio',   qd.medium ?? 0],
      ['Difícil', qd.hard   ?? 0],
    ],
    styles: BODY_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_STYLE,
    margin: TABLE_MARGIN,
    tableWidth: 80,
    columnStyles: { 1: { halign: 'center', cellWidth: 30 } },
  })
  y = lastY(doc) + 8

  // Recent activity
  if (stats.recent_activity?.length) {
    if (y > 140) { doc.addPage(); y = 14 }
    y = addSectionTitle(doc, 'Atividade Recente', y)
    autoTable(doc, {
      startY: y,
      head: [['Aluno', 'Prova', 'Matéria', 'Entregue em', 'Status', 'Nota']],
      body: stats.recent_activity.map(a => [
        a.student_name,
        a.exam_title,
        a.subject_name,
        fmtDateTime(a.submitted_at),
        STATUS_LABEL[a.status] ?? a.status,
        a.total_score != null ? String(a.total_score) : '—',
      ]),
      styles: BODY_STYLE,
      headStyles: HEAD_STYLE,
      alternateRowStyles: ALT_STYLE,
      margin: TABLE_MARGIN,
      columnStyles: {
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 24, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
      },
    })
  }

  applyFooters(doc)
  doc.save('relatorio-gerencial.pdf')
}
