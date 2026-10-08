import { useState } from 'react'
import toast from 'react-hot-toast'
import { aiApi, questionsApi } from '../../api'
import type { GeneratedQuestion, GeneratedQuestionOption, Subject } from '../../types'
import Modal from '../../components/Modal'
import QuotaExceededModal from '../../components/QuotaExceededModal'
import { useAuth } from '../../contexts/AuthContext'

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Múltipla Escolha',
  true_false: 'Verdadeiro/Falso',
  essay: 'Dissertativa',
  summation: 'Somatório',
}
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  multiple_choice: { bg: 'bg-teal-50 dark:bg-slate-800', text: 'text-teal-600 dark:text-teal-400' },
  true_false: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  essay: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  summation: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
}
const TYPE_COLORS_DEFAULT = { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' }
const DIFFICULTY_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  easy:   { label: 'Fácil',  bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  medium: { label: 'Médio',  bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-400', dot: 'bg-orange-500' },
  hard:   { label: 'Difícil', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
}
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

interface Props {
  subjects: Subject[]
  onClose: () => void
  onSaved: () => void
}

export default function AiGenerateModal({ subjects, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const [aiForm, setAiForm] = useState({
    subject_id: 0, topic: '', question_type: 'multiple_choice',
    difficulty: 'medium', count: 3, context: '', image_base64: '',
  })
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResults, setAiResults] = useState<GeneratedQuestion[]>([])
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set())
  const [aiSaving, setAiSaving] = useState(false)
  const [quotaModal, setQuotaModal] = useState<{ resource: 'ai_generation' | 'ai_correction'; used: number; limit: number } | null>(null)

  const creatableSubjects = subjects

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiForm.subject_id) { toast.error('Selecione uma matéria'); return }
    if (!aiForm.topic.trim()) { toast.error('Informe o tópico'); return }
    setAiGenerating(true)
    setAiResults([])
    setAiSelected(new Set())
    try {
      const r = await aiApi.generateQuestions(aiForm)
      setAiResults(r.data)
      setAiSelected(new Set(r.data.map((_, i) => i)))
      toast.success(`${r.data.length} questão(ões) gerada(s)!`)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 402 && detail?.code === 'quota_exceeded') {
        setQuotaModal({ resource: 'ai_generation', used: detail.used, limit: detail.limit })
      } else {
        toast.error(detail?.message ?? detail ?? 'Erro ao gerar questões')
      }
    } finally {
      setAiGenerating(false)
    }
  }

  const handleAiSave = async () => {
    if (aiSelected.size === 0) { toast.error('Selecione pelo menos uma questão'); return }
    setAiSaving(true)
    let saved = 0
    try {
      for (const idx of aiSelected) {
        const q = aiResults[idx]
        await questionsApi.create({
          statement: q.statement,
          question_type: q.question_type as any,
          difficulty: q.difficulty,
          is_public: false,
          subject_id: aiForm.subject_id,
          options: q.options,
          criteria: undefined,
          image_base64: aiForm.image_base64 || undefined,
        } as any)
        saved++
      }
      toast.success(`${saved} questão(ões) salva(s) no banco!`)
      onSaved()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setAiSaving(false)
    }
  }

  return (
    <>
      <Modal title="Gerar Questões com IA" onClose={onClose} size="xl">
        <div className="space-y-5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-gradient-to-br from-teal-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 border-teal-200 dark:border-slate-700">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-500 to-teal-600">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-xs font-semibold text-amber-500 dark:text-amber-400">Powered by Groq — qwen3-32b</span>
            <span className="ml-auto text-xs text-gray-400">Revise e edite antes de salvar</span>
          </div>

          <form onSubmit={handleAiGenerate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Matéria *</label>
                <select className="input" value={aiForm.subject_id} onChange={e => setAiForm(f => ({ ...f, subject_id: +e.target.value }))} required>
                  <option value={0}>Selecionar...</option>
                  {creatableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {user?.role === 'professor' && <p className="text-xs text-gray-400 mt-1">Só mostra as matérias atribuídas a você</p>}
              </div>
              <div>
                <label className="label">Tópico *</label>
                <input className="input" placeholder="Ex: Fotossíntese, Segunda Guerra Mundial..." value={aiForm.topic} onChange={e => setAiForm(f => ({ ...f, topic: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Tipo de Questão</label>
                <select className="input" value={aiForm.question_type} onChange={e => setAiForm(f => ({ ...f, question_type: e.target.value }))}>
                  <option value="multiple_choice">Múltipla Escolha</option>
                  <option value="true_false">Verdadeiro/Falso</option>
                  <option value="essay">Dissertativa</option>
                  <option value="summation">Somatório</option>
                </select>
              </div>
              <div>
                <label className="label">Dificuldade</label>
                <select className="input" value={aiForm.difficulty} onChange={e => setAiForm(f => ({ ...f, difficulty: e.target.value }))}>
                  <option value="easy">Fácil</option>
                  <option value="medium">Médio</option>
                  <option value="hard">Difícil</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Quantidade de questões</label>
              <div className="flex gap-2">
                {[1, 3, 5, 8, 10].map(n => (
                  <button key={n} type="button" onClick={() => setAiForm(f => ({ ...f, count: n }))}
                    className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all border ${aiForm.count === n ? 'bg-teal-600 text-white border-teal-600' : 'bg-[#F4F6F9] dark:bg-[#464554] text-[#334155] dark:text-gray-300 border-slate-200 dark:border-slate-700'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Contexto <span className="font-normal text-gray-400">(opcional)</span></label>
              <textarea className="input" rows={6} placeholder="Cole aqui um trecho de livro, poema, artigo científico..." value={aiForm.context} onChange={e => setAiForm(f => ({ ...f, context: e.target.value }))} />
            </div>

            <div>
              <label className="label">Imagem de referência <span className="font-normal text-gray-400">(opcional)</span></label>
              {aiForm.image_base64 ? (
                <div className="relative inline-block">
                  <img src={`data:image/jpeg;base64,${aiForm.image_base64}`} alt="Imagem de contexto" className="rounded-xl border max-h-48 object-contain border-teal-200 dark:border-slate-700" />
                  <button type="button" onClick={() => setAiForm(f => ({ ...f, image_base64: '' }))} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:bg-teal-50 dark:hover:bg-slate-700 border-teal-200 dark:border-slate-700 text-amber-500 dark:text-amber-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  Anexar imagem
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return
                    const reader = new FileReader(); reader.onload = ev => { const result = ev.target?.result as string; setAiForm(f => ({ ...f, image_base64: result.split(',')[1] })) }; reader.readAsDataURL(file)
                  }} />
                </label>
              )}
              {aiForm.image_base64 && <p className="text-xs text-teal-600 dark:text-teal-400 mt-1.5">A IA analisará a imagem para gerar questões sobre ela.</p>}
            </div>

            <button type="submit" disabled={aiGenerating} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 bg-gradient-to-br from-amber-500 to-teal-600">
              {aiGenerating ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Gerando com IA...</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Gerar {aiForm.count} {aiForm.count !== 1 ? 'Questões' : 'Questão'}</>
              )}
            </button>
          </form>

          {aiResults.length > 0 && (
            <div className="space-y-3 border-t pt-4 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#1E293B]">{aiResults.length} {aiResults.length !== 1 ? 'questões' : 'questão'} gerada{aiResults.length !== 1 ? 's' : ''}<span className="ml-2 text-xs font-normal text-gray-400">({aiSelected.size} selecionada{aiSelected.size !== 1 ? 's' : ''})</span></p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAiSelected(new Set(aiResults.map((_, i) => i)))} className="text-xs font-semibold text-amber-500 dark:text-amber-400 hover:underline">Todas</button>
                  <span className="text-gray-300">·</span>
                  <button type="button" onClick={() => setAiSelected(new Set())} className="text-xs font-semibold text-gray-400 hover:underline">Nenhuma</button>
                </div>
              </div>
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {aiResults.map((q, idx) => {
                  const selected = aiSelected.has(idx)
                  const diffCfg = DIFFICULTY_CONFIG[q.difficulty ?? 'medium'] ?? DIFFICULTY_CONFIG.medium
                  const typeStyle = TYPE_COLORS[q.question_type] ?? TYPE_COLORS_DEFAULT
                  return (
                    <div key={idx} onClick={() => setAiSelected(s => { const next = new Set(s); next.has(idx) ? next.delete(idx) : next.add(idx); return next })}
                      className={`rounded-xl border p-4 cursor-pointer transition-all ${selected ? 'border-amber-500 bg-teal-50 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${selected ? 'bg-amber-500 border-amber-500' : 'border-gray-300 dark:border-gray-600'}`}>
                          {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeStyle.bg} ${typeStyle.text}`}>{TYPE_LABELS[q.question_type]}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${diffCfg.bg} ${diffCfg.text}`}><span className={`w-1.5 h-1.5 rounded-full ${diffCfg.dot}`} />{diffCfg.label}</span>
                          </div>
                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{q.statement}</p>
                          {q.options.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {q.options.map((o: GeneratedQuestionOption, i: number) => (
                                <span key={i} className={`text-xs px-2 py-0.5 rounded-lg border ${o.is_correct ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40 font-semibold' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                                  {OPTION_LETTERS[i]}. {o.text}{o.is_correct ? ' ✓' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button onClick={handleAiSave} disabled={aiSaving || aiSelected.size === 0} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 bg-gradient-to-br from-teal-600 to-amber-500">
                {aiSaving ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Salvando...</>
                ) : (
                  <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg> Salvar {aiSelected.size} {aiSelected.size !== 1 ? 'questões' : 'questão'} no banco</>
                )}
              </button>
            </div>
          )}
        </div>
      </Modal>
      {quotaModal && (
        <QuotaExceededModal resource={quotaModal.resource} used={quotaModal.used} limit={quotaModal.limit} onClose={() => setQuotaModal(null)}
          onContactSupport={() => { setQuotaModal(null); window.open('mailto:dietterle@gmail.com?subject=Pacote avulso de IA', '_blank') }} />
      )}
    </>
  )
}