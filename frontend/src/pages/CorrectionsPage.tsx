import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { classesApi, examsApi } from '../api'
import { submissionsApi } from '../api/submissions'
import type { Class, Exam } from '../types'
import type { SubmissionList } from '../types/submission'
import { exportCorrections } from '../utils/pdf'

// Correção por IA costuma levar segundos; acima disso, provavelmente travou
// numa questão (erro da IA, cota esgotada) e precisa de "Finalizar" manual.
const STUCK_THRESHOLD_MIN = 5

function minutesSince(iso?: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

export default function CorrectionsPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [examsByClass, setExamsByClass] = useState<Record<number, Exam[]>>({})
  const [submissionsByExam, setSubmissionsByExam] = useState<Record<number, SubmissionList[]>>({})
  const [expandedClass, setExpandedClass] = useState<number | null>(null)
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([classesApi.list(), examsApi.list()]).then(async ([clsRes, examsRes]) => {
      if (cancelled) return
      setClasses(clsRes.data)
      const byClass: Record<number, Exam[]> = {}
      examsRes.data.forEach(e => {
        byClass[e.class_id] = [...(byClass[e.class_id] ?? []), e]
      })
      setExamsByClass(byClass)
      // Carrega as submissões de todas as provas de uma vez, pra montar a lista
      // "Precisa de atenção" e os contadores sem exigir que o professor expanda turma por turma.
      const subsEntries = await Promise.all(
        examsRes.data.map(e =>
          submissionsApi.listByExam(e.id).then(r => [e.id, r.data] as const).catch(() => [e.id, []] as const)
        )
      )
      if (cancelled) return
      setSubmissionsByExam(Object.fromEntries(subsEntries))
    })
    submissionsApi.ollamaStatus().then(r => setOllamaOk(r.data.available))
    return () => { cancelled = true }
  }, [])

  const attentionItems = classes.flatMap(cls =>
    (examsByClass[cls.id] ?? []).map(exam => {
      const subs = submissionsByExam[exam.id] ?? []
      const correcting = subs.filter(s => s.status === 'correcting')
      return {
        cls,
        exam,
        pendingCount: subs.filter(s => s.status === 'pending').length,
        correctingCount: correcting.length,
        stuckCount: correcting.filter(s => (minutesSince(s.correcting_since) ?? 0) >= STUCK_THRESHOLD_MIN).length,
      }
    })
  ).filter(x => x.pendingCount > 0 || x.correctingCount > 0)

  const totalSubmissions = Object.values(submissionsByExam).flat().length
  const totalDone = Object.values(submissionsByExam).flat().filter(s => s.status === 'done' || s.status === 'released').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#4f46e5] dark:text-[#818CF8]">Correções</h1>
          <p className="text-sm text-gray-500 mt-0.5">{classes.length} turma{classes.length !== 1 ? 's' : ''} disponíve{classes.length !== 1 ? 'is' : 'l'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCorrections(classes, examsByClass, submissionsByExam)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-[#E2E8F0] bg-white text-[#4f46e5] hover:bg-[#EFF6FF] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar PDF
          </button>
          {/* AI status pill */}
          <div
            className={
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium " +
              (ollamaOk
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                : ollamaOk === false
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                : "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400")
            }
          >
            <span
              className={
                "w-2 h-2 rounded-full " +
                (ollamaOk ? "bg-green-500" : ollamaOk === false ? "bg-red-500" : "bg-gray-400 dark:bg-gray-500")
              }
            />
            {ollamaOk === null ? 'Verificando IA…' : ollamaOk ? 'IA Online (Groq)' : 'IA Offline (GROQ_API_KEY)'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Turmas', value: classes.length, bg: 'bg-[#eef2ff] dark:bg-[#1a2947]', fg: 'text-[#4f46e5] dark:text-[#818CF8]' },
          { label: 'Submissões', value: totalSubmissions, bg: 'bg-[#f5f0ff] dark:bg-[#251a42]', fg: 'text-[#712ae2] dark:text-[#b79bff]' },
          { label: 'Corrigidas', value: totalDone, bg: 'bg-[#f0fdf8] dark:bg-[#0f2e22]', fg: 'text-[#27c38a] dark:text-[#4ade80]' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.bg} border-transparent`}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold font-display ${s.fg}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Precisa de atenção — visão plana, direto pra correção da prova */}
      {attentionItems.length > 0 && (
        <div className="rounded-2xl border p-4 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="stroke-amber-600 dark:stroke-amber-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              Precisa de atenção ({attentionItems.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {attentionItems.map(({ cls, exam, pendingCount, correctingCount, stuckCount }) => (
              <Link
                key={exam.id}
                to={`/exams/${exam.id}/submissions`}
                className={
                  "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white dark:bg-[#131f37] border text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors " +
                  (stuckCount > 0 ? "border-red-300 dark:border-red-800" : "border-amber-200 dark:border-amber-800")
                }
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{exam.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{cls.name} — {cls.year}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {pendingCount > 0 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300">
                      {pendingCount} aguardando
                    </span>
                  )}
                  {stuckCount > 0 ? (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      title="Corrigindo há mais tempo que o normal — provavelmente travou numa questão"
                    >
                      {stuckCount} travada{stuckCount > 1 ? 's' : ''} ⚠
                    </span>
                  ) : correctingCount > 0 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">
                      {correctingCount} em correção
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Classes accordion — navegação por turma, cada prova abre a correção completa */}
      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <p className="font-medium">Nenhuma turma encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map(cls => (
            <div
              key={cls.id}
              className="rounded-2xl border bg-white dark:bg-[#131f37] overflow-hidden border-[#E2E8F0] dark:border-[#1e2d4a]"
            >
              {/* Class header */}
              <button
                onClick={() => setExpandedClass(expandedClass === cls.id ? null : cls.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm bg-[#eef2ff] dark:bg-[#1a2947] text-[#4f46e5] dark:text-[#818CF8]">
                    {cls.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{cls.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{cls.year}</p>
                  </div>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" className="stroke-gray-400 dark:stroke-gray-500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: expandedClass === cls.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Exams list */}
              {expandedClass === cls.id && (
                <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a]">
                  {(examsByClass[cls.id] ?? []).length === 0 ? (
                    <p className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500">Nenhuma prova nesta turma</p>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(examsByClass[cls.id] ?? []).map(exam => {
                        const subs = submissionsByExam[exam.id] ?? []
                        const pendingCount    = subs.filter(s => s.status === 'pending').length
                        const correctingCount = subs.filter(s => s.status === 'correcting').length
                        const doneCount       = subs.filter(s => s.status === 'done').length
                        const releasedCount   = subs.filter(s => s.status === 'released').length

                        return (
                          <Link
                            key={exam.id}
                            to={`/exams/${exam.id}/submissions`}
                            className="flex items-center gap-3 px-5 py-3 hover:bg-[#F4F6F9] dark:hover:bg-white/5 transition-colors"
                          >
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#eef2ff] dark:bg-[#1a2947]">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="stroke-[#4f46e5] dark:stroke-[#818CF8]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                            </div>
                            <span className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate flex-1 min-w-0">{exam.title}</span>
                            {exam.subject?.name && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 bg-[#eef2ff] dark:bg-[#1a2947] text-[#4f46e5] dark:text-[#818CF8]">
                                {exam.subject.name}
                              </span>
                            )}

                            {/* Counters */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {pendingCount > 0 && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-gray-50 dark:bg-gray-700/40 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600">
                                  {pendingCount} aguardando
                                </span>
                              )}
                              {correctingCount > 0 && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                  {correctingCount} corrigindo
                                </span>
                              )}
                              {doneCount > 0 && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                  {doneCount} corrigido{doneCount > 1 ? 's' : ''}
                                </span>
                              )}
                              {releasedCount > 0 && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                  {releasedCount} liberado{releasedCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>

                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-gray-400 dark:stroke-gray-500 flex-shrink-0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
