import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { questionsApi } from '../../api'
import type { Question, Subject } from '../../types'
import Modal from '../../components/Modal'

const SUMMATION_VALUES = [1, 2, 4, 8, 16, 32]
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

interface OptionForm { text: string; is_correct: boolean; order: number }
interface QuestionForm {
  statement: string
  question_type: string
  is_public: boolean
  difficulty: string
  subject_id: number
  options: OptionForm[]
  image_base64?: string
}

const emptyForm = (): QuestionForm => ({
  statement: '',
  question_type: 'multiple_choice',
  is_public: false,
  difficulty: 'medium',
  subject_id: 0,
  options: [
    { text: '', is_correct: false, order: 1 },
    { text: '', is_correct: false, order: 2 },
    { text: '', is_correct: false, order: 3 },
    { text: '', is_correct: false, order: 4 },
  ],
})

interface Props {
  editing: Question | null
  subjects: Subject[]
  onClose: () => void
  onSaved: () => void
}

export default function QuestionFormModal({ editing, subjects, onClose, onSaved }: Props) {
  const [form, setForm] = useState<QuestionForm>(emptyForm())

  useEffect(() => {
    if (editing) {
      const opts = editing.options.map((o) => ({ text: o.text, is_correct: o.is_correct, order: o.order }))
      setForm({
        statement: editing.statement,
        question_type: editing.question_type,
        is_public: editing.is_public,
        difficulty: editing.difficulty || 'medium',
        subject_id: editing.subject_id,
        options: editing.question_type === 'summation' ? opts.sort((a, b) => a.order - b.order) : opts,
        image_base64: editing.image_base64 || undefined,
      })
    } else {
      setForm(emptyForm())
    }
  }, [editing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.subject_id === 0) { toast.error('Selecione uma matéria'); return }
    const needsOptions = form.question_type !== 'essay'
    if (needsOptions && !form.options.some((o) => o.is_correct)) {
      toast.error('Marque pelo menos uma opção correta'); return
    }
    if (form.question_type === 'summation' && form.options.some((o) => !o.text.trim())) {
      toast.error('Preencha o texto de todas as proposições'); return
    }
    try {
      const payload = {
        ...form,
        options: needsOptions ? form.options.filter((o) => o.text.trim()) : [],
      }
      if (editing) {
        await questionsApi.update(editing.id, payload as any)
        toast.success('Questão atualizada')
      } else {
        await questionsApi.create(payload as any)
        toast.success('Questão criada')
      }
      onSaved()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar')
    }
  }

  const updateOption = (idx: number, field: keyof OptionForm, value: string | boolean) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => i === idx ? { ...o, [field]: value } : o),
    }))
  }

  const setCorrect = (idx: number) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => ({ ...o, is_correct: i === idx })),
    }))
  }

  const toggleCorrect = (idx: number) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => i === idx ? { ...o, is_correct: !o.is_correct } : o),
    }))
  }

  const addOption = () => {
    setForm((f) => ({ ...f, options: [...f.options, { text: '', is_correct: false, order: f.options.length + 1 }] }))
  }

  const removeOption = (idx: number) => {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))
  }

  return (
    <Modal title={editing ? 'Editar Questão' : 'Nova Questão'} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Matéria</label>
            <select
              className="input"
              value={form.subject_id}
              onChange={(e) => setForm({ ...form, subject_id: +e.target.value })}
              required
            >
              <option value={0}>Selecionar...</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo de Questão</label>
            <select
              className="input"
              value={form.question_type}
              onChange={(e) => {
                const newType = e.target.value
                if (newType === 'summation') {
                  setForm({
                    ...form,
                    question_type: 'summation',
                    options: SUMMATION_VALUES.map(v => ({ text: '', is_correct: false, order: v })),
                  })
                } else if (form.question_type === 'summation') {
                  setForm({
                    ...form,
                    question_type: newType,
                    options: [
                      { text: '', is_correct: false, order: 1 },
                      { text: '', is_correct: false, order: 2 },
                      { text: '', is_correct: false, order: 3 },
                      { text: '', is_correct: false, order: 4 },
                    ],
                  })
                } else {
                  setForm({ ...form, question_type: newType })
                }
              }}
            >
              <option value="multiple_choice">Múltipla Escolha</option>
              <option value="true_false">Verdadeiro/Falso</option>
              <option value="essay">Dissertativa</option>
              <option value="summation">Somatório</option>
            </select>
          </div>
          <div>
            <label className="label">Dificuldade</label>
            <select
              className="input"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            >
              <option value="easy">Fácil</option>
              <option value="medium">Médio</option>
              <option value="hard">Difícil</option>
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.is_public ? 'bg-[#27c38a]' : 'bg-gray-300 dark:bg-gray-600'}`}
                onClick={() => setForm({ ...form, is_public: !form.is_public })}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: form.is_public ? 'translateX(21px)' : 'translateX(2px)' }}
                />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Questão pública</span>
            </label>
          </div>
        </div>

        <div>
          <label className="label">Imagem <span className="font-normal text-gray-400">(opcional)</span></label>
          {form.image_base64 ? (
            <div className="relative inline-block">
              <img
                src={`data:image/jpeg;base64,${form.image_base64}`}
                alt="Imagem da questão"
                className="rounded-xl border max-h-48 object-contain border-[#E2E8F0] dark:border-[#464554]"
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, image_base64: undefined })}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-[#1e2d4a] border-[#E2E8F0] dark:border-[#464554] text-amber-500 dark:text-amber-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Anexar imagem
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => {
                    const result = ev.target?.result as string
                    const base64 = result.split(',')[1]
                    setForm(f => ({ ...f, image_base64: base64 }))
                  }
                  reader.readAsDataURL(file)
                }}
              />
            </label>
          )}
        </div>

        <div>
          <label className="label">Enunciado</label>
          <textarea
            className="input"
            rows={4}
            placeholder="Digite o enunciado da questão..."
            value={form.statement}
            onChange={(e) => setForm({ ...form, statement: e.target.value })}
            required
          />
        </div>

        {form.question_type !== 'essay' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">
                {form.question_type === 'summation' ? 'Proposições' : 'Opções de Resposta'}
              </label>
              {form.question_type !== 'summation' && (
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-teal-50 dark:hover:bg-slate-700 text-amber-500 dark:text-amber-400 border-teal-200 dark:border-slate-700"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Adicionar opção
                </button>
              )}
            </div>
            {form.question_type === 'summation' && (() => {
              const answer = form.options.filter(o => o.is_correct).reduce((acc, o) => acc + o.order, 0)
              const parts = form.options.filter(o => o.is_correct).map(o => String(o.order).padStart(2, '0'))
              return (
                <div className="mb-3 flex items-center gap-4 p-3 rounded-xl border bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Resposta</span>
                    <span className="text-2xl font-bold font-mono leading-tight text-orange-700 dark:text-orange-300">
                      {String(answer).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-xs text-orange-600 dark:text-orange-400 leading-relaxed">
                    {parts.length > 0
                      ? `${parts.join(' + ')} = ${answer}`
                      : 'Marque as proposições corretas. A resposta é a soma dos valores marcados.'}
                  </p>
                </div>
              )
            })()}
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => form.question_type === 'summation' ? toggleCorrect(i) : setCorrect(i)}
                    className={`flex-shrink-0 border-2 flex items-center justify-center transition-all ${opt.is_correct ? 'bg-green-500 border-green-500' : 'bg-transparent border-gray-300 dark:border-gray-600'}`}
                    style={{
                      width: 22, height: 22,
                      borderRadius: form.question_type === 'summation' ? 4 : '50%',
                    }}
                  >
                    {opt.is_correct && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`flex items-center justify-center text-xs font-bold flex-shrink-0 ${form.question_type === 'summation' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' : 'bg-teal-50 dark:bg-slate-800 text-teal-600 dark:text-teal-400'}`}
                    style={{
                      width: 24, height: 24,
                      borderRadius: form.question_type === 'summation' ? 4 : '50%',
                      fontFamily: form.question_type === 'summation' ? 'monospace' : 'inherit',
                    }}
                  >
                    {form.question_type === 'summation' ? String(opt.order).padStart(2, '0') : (OPTION_LETTERS[i] || (i + 1))}
                  </span>
                  <input
                    className="input flex-1"
                    placeholder={form.question_type === 'summation' ? `Texto da proposição ${String(opt.order).padStart(2, '0')}` : `Opção ${OPTION_LETTERS[i] || (i + 1)}`}
                    value={opt.text}
                    onChange={(e) => updateOption(i, 'text', e.target.value)}
                  />
                  {form.question_type !== 'summation' && form.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2 border-t border-[#E2E8F0] dark:border-[#464554]">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 bg-gradient-to-br from-teal-600 to-amber-500"
          >
            {editing ? 'Salvar Alterações' : 'Criar Questão'}
          </button>
        </div>
      </form>
    </Modal>
  )
}