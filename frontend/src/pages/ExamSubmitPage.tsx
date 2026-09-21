import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { examsApi } from '../api'
import { submissionsApi } from '../api/submissions'
import { useAuth } from '../contexts/AuthContext'
import { seededShuffle } from '../utils/shuffle'
import { extractSource } from '../utils/questionSource'
import type { Exam } from '../types'
import AdSlot from '../components/AdSlot'

const ADSENSE_SLOT_EXAM = (import.meta.env.VITE_ADSENSE_SLOT_EXAM as string | undefined) || ''

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function EssayInput({
  essayText,
  essayImage,
  onTextChange,
  onImageChange,
}: {
  essayText: string
  essayImage?: string
  onTextChange: (t: string) => void
  onImageChange: (b64: string | undefined) => void
}) {
  const [tab, setTab] = useState<'text' | 'image'>(essayImage ? 'image' : 'text')

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => {
      const result = e.target?.result as string
      onImageChange(result)
      setTab('image')
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <div className="flex gap-1 mb-3 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('text')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            tab === 'text' ? 'bg-white shadow text-[#1E293B]' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ✏️ Digitar resposta
        </button>
        <button
          type="button"
          onClick={() => setTab('image')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            tab === 'image' ? 'bg-white shadow text-[#1E293B]' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📷 Foto da redação
        </button>
      </div>

      {tab === 'text' ? (
        <textarea
          className="input min-h-40 resize-y"
          placeholder="Digite sua resposta aqui..."
          value={essayText}
          onChange={e => onTextChange(e.target.value)}
        />
      ) : (
        <div>
          {essayImage ? (
            <div className="relative">
              <img
                src={essayImage}
                alt="Foto da redação"
                className="w-full max-h-80 object-contain rounded-xl border border-gray-200 bg-gray-50"
              />
              <button
                type="button"
                onClick={() => { onImageChange(undefined); setTab('text') }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold hover:bg-red-600 transition-colors"
              >
                ×
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">Imagem enviada. A IA irá ler e corrigir a redação.</p>
            </div>
          ) : (
            <label
              className="flex flex-col items-center justify-center border-2 border-dashed border-[#c7d3f0] dark:border-[#464554] rounded-xl p-8 cursor-pointer hover:border-[#4f63d2] dark:hover:border-[#5b6fd8] hover:bg-[#f5f7ff] dark:hover:bg-[#1a2947] transition-all"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <div className="text-4xl mb-3">📷</div>
              <p className="text-sm font-semibold text-[#374060] mb-1">Tirar foto ou escolher imagem</p>
              <p className="text-xs text-gray-400">Arraste a imagem aqui ou clique para selecionar</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP • máx. 10 MB</p>
            </label>
          )}
        </div>
      )}
    </div>
  )
}

export default function ExamSubmitPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [answers, setAnswers] = useState<Record<number, { selected_option_id?: number; essay_text?: string; essay_image_base64?: string }>>({})

  useEffect(() => {
    if (!id) return
    examsApi.get(+id)
      .then(r => { setExam(r.data); setLoading(false) })
      .catch(() => { toast.error('Prova não encontrada'); navigate('/exams') })
  }, [id])

  // Deterministic shuffle seeded by student_id + exam_id so each student gets
  // a unique but stable ordering (same on refresh, different from classmates).
  const shuffledExam = useMemo(() => {
    if (!exam || !user) return null
    const seed = user.id * 1_000_003 + exam.id
    const shuffledQuestions = seededShuffle(exam.exam_questions, seed)
    return {
      ...exam,
      exam_questions: shuffledQuestions.map((eq, idx) => ({
        ...eq,
        // shuffle options with a per-question seed so option order also varies
        question: {
          ...eq.question,
          options: eq.question.question_type === 'essay'
            ? eq.question.options
            : eq.question.question_type === 'summation'
            ? [...eq.question.options].sort((a, b) => a.order - b.order)
            : seededShuffle(eq.question.options, seed + eq.id),
        },
        _displayOrder: idx + 1,
      })),
    }
  }, [exam, user])

  const setOption = (examQuestionId: number, optionId: number) =>
    setAnswers(a => ({ ...a, [examQuestionId]: { selected_option_id: optionId } }))

  const setEssay = (examQuestionId: number, text: string) =>
    setAnswers(a => ({ ...a, [examQuestionId]: { ...a[examQuestionId], essay_text: text, essay_image_base64: undefined } }))

  const setEssayImage = (examQuestionId: number, base64: string | undefined) =>
    setAnswers(a => ({ ...a, [examQuestionId]: { ...a[examQuestionId], essay_image_base64: base64, essay_text: base64 ? a[examQuestionId]?.essay_text : a[examQuestionId]?.essay_text } }))

  const toggleProposition = (examQuestionId: number, orderValue: number) =>
    setAnswers(a => {
      const current = parseInt(a[examQuestionId]?.essay_text || '0')
      const newSum = (current & orderValue) ? current ^ orderValue : current | orderValue
      return { ...a, [examQuestionId]: { essay_text: String(newSum) } }
    })

  const handleSubmit = async () => {
    if (!shuffledExam) return
    const unanswered = shuffledExam.exam_questions.filter(eq => {
      const ans = answers[eq.id]
      if (eq.question.question_type === 'essay') return !ans?.essay_text?.trim() && !ans?.essay_image_base64
      if (eq.question.question_type === 'summation') return ans?.essay_text == null
      return !ans?.selected_option_id
    })
    if (unanswered.length > 0) {
      toast.error(`Responda todas as questões. Faltam ${unanswered.length}.`)
      return
    }
    setSubmitting(true)
    try {
      const payload = shuffledExam.exam_questions.map(eq => ({
        exam_question_id: eq.id,
        ...answers[eq.id],
      }))
      await submissionsApi.submit(shuffledExam.id, payload)
      toast.success('Prova entregue com sucesso!')
      navigate(`/exams/${shuffledExam.id}/result`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao entregar prova')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Carregando...</div>
  if (!shuffledExam) return null

  const totalPoints = shuffledExam.exam_questions.reduce((s, eq) => s + eq.points, 0)
  const answered = Object.keys(answers).length

  return (
    <div className="max-w-3xl">
      <div className="card mb-6 bg-blue-50 border-blue-200">
        <h1 className="text-xl font-bold text-blue-900">{shuffledExam.title}</h1>
        <div className="flex gap-4 mt-2 text-sm text-blue-700">
          <span>{shuffledExam.subject.name}</span>
          <span>•</span>
          <span>{shuffledExam.class_.name}</span>
          <span>•</span>
          <span>{totalPoints} pontos</span>
          <span>•</span>
          <span>{answered}/{shuffledExam.exam_questions.length} respondidas</span>
        </div>
        {shuffledExam.instructions && (
          <p className="mt-3 text-sm text-blue-800 italic">{shuffledExam.instructions}</p>
        )}
      </div>

      <div className="space-y-6">
        {shuffledExam.exam_questions.map((eq, i) => {
          const q = eq.question
          const ans = answers[eq.id]
          const { statement, source } = extractSource(q.statement)
          return (
            <div key={eq.id} className="card">
              <div className="flex justify-between items-start mb-3 gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">
                    Questão {i + 1}
                    <span className="text-gray-400 font-normal text-sm ml-2">({eq.points} pts)</span>
                  </span>
                  {source && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3V7M4 7c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3M4 7c0-2 1.5-3 4-3h8c2.5 0 4 1 4 3" /></svg>
                      {source}
                    </span>
                  )}
                </div>
                {ans && (
                  <span className="badge bg-green-100 text-green-700 text-xs shrink-0">Respondida</span>
                )}
              </div>
              <div className="rich-statement text-gray-900 mb-4" dangerouslySetInnerHTML={{ __html: statement }} />
              {q.image_base64 && (
                <img
                  src={q.image_base64?.startsWith('data:') ? q.image_base64 : `data:image/jpeg;base64,${q.image_base64}`}
                  alt="Imagem da questão"
                  className="mb-4 rounded-lg border max-h-64 object-contain"
                />
              )}

              {q.question_type === 'summation' ? (
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const currentSum = parseInt(ans?.essay_text ?? '-1')
                    const isChecked = ans?.essay_text != null && (currentSum & opt.order) !== 0
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isChecked ? 'bg-orange-50 border-orange-400' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleProposition(eq.id, opt.order)}
                          className="mt-0.5 accent-orange-600"
                        />
                        <span className="font-mono font-bold text-sm shrink-0 w-6" style={{ color: isChecked ? '#c2410c' : '#9ca3af' }}>
                          {String(opt.order).padStart(2, '0')}
                        </span>
                        <span className="text-sm">{opt.text}</span>
                      </label>
                    )
                  })}
                  <div className="mt-1 p-2 rounded-lg text-center" style={{ background: '#fff7ed' }}>
                    <span className="text-xs text-orange-600 mr-2">Sua resposta:</span>
                    <span className="font-mono font-bold text-lg" style={{ color: '#c2410c' }}>
                      {String(Math.max(0, parseInt(ans?.essay_text ?? '0'))).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              ) : q.question_type !== 'essay' ? (
                <div className="space-y-2">
                  {q.options.map((opt, j) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        ans?.selected_option_id === opt.id
                          ? 'bg-blue-50 border-blue-400'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${eq.id}`}
                        value={opt.id}
                        checked={ans?.selected_option_id === opt.id}
                        onChange={() => setOption(eq.id, opt.id)}
                        className="mt-0.5 accent-blue-600"
                      />
                      <span className="text-sm">
                        <b className="mr-1">{LETTERS[j]})</b> {opt.text}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <EssayInput
                  essayText={ans?.essay_text ?? ''}
                  essayImage={ans?.essay_image_base64}
                  onTextChange={text => setEssay(eq.id, text)}
                  onImageChange={b64 => setEssayImage(eq.id, b64)}
                />
              )}

              <div className="mt-4">
                <AdSlot key={eq.id} slot={ADSENSE_SLOT_EXAM} className="h-24" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="sticky bottom-0 bg-white border-t mt-8 py-4 flex justify-between items-center">
        <span className="text-sm text-gray-500">
          {answered} de {shuffledExam.exam_questions.length} questões respondidas
        </span>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary px-8 py-2.5"
        >
          {submitting ? 'Entregando...' : 'Entregar Prova'}
        </button>
      </div>
    </div>
  )
}
