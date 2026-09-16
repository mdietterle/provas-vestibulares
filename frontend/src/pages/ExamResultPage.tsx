import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { submissionsApi } from '../api/submissions'
import { exportStudentResult } from '../utils/pdf'
import { extractSource } from '../utils/questionSource'
import type { Submission } from '../types/submission'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export default function ExamResultPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [notReleased, setNotReleased] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    submissionsApi.mySubmission(+id)
      .then(r => { setSubmission(r.data); setNotReleased(false) })
      .catch(err => {
        if (err.response?.status === 403) {
          setNotReleased(true)
        } else {
          navigate('/exams')
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-12 text-gray-400">Carregando...</div>

  if (notReleased) {
    return (
      <div className="max-w-3xl">
        <button onClick={() => navigate('/exams')} className="btn-secondary btn-sm mb-6">← Voltar</button>
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Aguardando liberação</h2>
          <p className="text-gray-500">
            Sua prova foi entregue. A nota será exibida aqui assim que o professor liberar os resultados.
          </p>
        </div>
      </div>
    )
  }

  if (!submission) return null

  const totalPossible = submission.answers.reduce((s, a) => s + (a.exam_question.points ?? 0), 0)
  const pct = totalPossible > 0 ? Math.round(((submission.total_score ?? 0) / totalPossible) * 100) : 0

  // Desempenho por tipo de questão
  const byType = submission.answers.reduce<Record<string, { earned: number; max: number }>>((acc, ans) => {
    const type = ans.exam_question.question?.question_type ?? 'multiple_choice'
    const label = type === 'essay' ? 'Dissertativa' : type === 'true_false' ? 'V ou F' : type === 'summation' ? 'Somatório' : 'Múltipla escolha'
    if (!acc[label]) acc[label] = { earned: 0, max: 0 }
    acc[label].earned += ans.score ?? 0
    acc[label].max += ans.exam_question.points ?? 0
    return acc
  }, {})

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/exams')} className="btn-secondary btn-sm">← Voltar</button>
        <button
          onClick={() => exportStudentResult(submission)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-[#E2E8F0] bg-white text-[#2563EB] hover:bg-[#EFF6FF] transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Exportar Resultado PDF
        </button>
      </div>

      {/* Score card + Desempenho por Tópico lado a lado */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {/* Score */}
        <div className={`card text-center ${pct >= 60 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'}`}>
          <div className="text-sm font-medium mb-1 text-gray-500">Resultado da prova</div>
          <div className="text-5xl font-bold my-2" style={{ color: pct >= 60 ? '#15803d' : '#dc2626' }}>
            {submission.total_score?.toFixed(1)}
          </div>
          <div className="text-gray-500 text-sm mb-3">de {totalPossible} pontos</div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 60 ? '#22c55e' : '#ef4444' }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{pct}% de aproveitamento</p>
        </div>

        {/* Desempenho por Tópico */}
        <div className="card">
          <p className="text-sm font-semibold text-[#1E293B] mb-3">Desempenho por Tipo</p>
          {Object.keys(byType).length === 0 ? (
            <p className="text-xs text-gray-400">Sem dados</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byType).map(([label, { earned, max }]) => {
                const typePct = max > 0 ? Math.round((earned / max) * 100) : 0
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#334155]">{label}</span>
                      <span className="font-semibold" style={{ color: typePct >= 60 ? '#16a34a' : typePct >= 40 ? '#d97706' : '#dc2626' }}>{typePct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${typePct}%`, background: typePct >= 60 ? '#22c55e' : typePct >= 40 ? '#f59e0b' : '#ef4444' }}
                      />
                    </div>
                    <p className="text-[11px] text-[#9ca3af] mt-0.5">{earned.toFixed(1)} / {max} pts</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Answers */}
      <div className="space-y-4">
        {submission.answers.map((ans, i) => {
          const eq = ans.exam_question
          const q = eq.question
          const isCorrect = ans.score != null && ans.score >= eq.points
          const isPartial = ans.score != null && ans.score > 0 && ans.score < eq.points
          const isWrong = ans.score === 0
          const { statement, source } = extractSource(q.statement)

          return (
            <div key={ans.id} className={`card border-l-4 ${
              isCorrect ? 'border-l-green-500' :
              isPartial ? 'border-l-yellow-500' :
              isWrong   ? 'border-l-red-400'   : 'border-l-gray-200'
            }`}>
              <div className="flex justify-between items-start mb-2 gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">Questão {i + 1}</span>
                  {source && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3V7M4 7c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3M4 7c0-2 1.5-3 4-3h8c2.5 0 4 1 4 3" /></svg>
                      {source}
                    </span>
                  )}
                </div>
                {ans.score != null && (
                  <span className={`text-sm font-bold shrink-0 ${
                    isCorrect ? 'text-green-600' : isPartial ? 'text-yellow-600' : 'text-red-500'
                  }`}>
                    {ans.score}/{eq.points} pts
                  </span>
                )}
              </div>

              <div className="text-gray-800 text-sm mb-3 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: statement }} />

              {q.question_type !== 'essay' ? (
                <div className="space-y-1.5">
                  {q.options.sort((a, b) => a.order - b.order).map((opt, j) => {
                    const isSelected = ans.selected_option_id === opt.id
                    return (
                      <div key={opt.id} className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                        opt.is_correct                      ? 'bg-green-50 text-green-800' :
                        isSelected && !opt.is_correct ? 'bg-red-50 text-red-700'   : 'text-gray-600'
                      }`}>
                        <span className="font-medium w-4">{LETTERS[j]})</span>
                        <span className="flex-1 prose prose-xs max-w-none" dangerouslySetInnerHTML={{ __html: opt.text }} />
                        {opt.is_correct && <span className="text-green-600 text-xs font-bold">✓ Correta</span>}
                        {isSelected && !opt.is_correct && <span className="text-red-500 text-xs">Sua resposta</span>}
                        {isSelected && opt.is_correct && <span className="text-green-600 text-xs font-bold">✓ Sua resposta</span>}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <>
                  {ans.essay_image_base64 && (
                    <div className="mb-2">
                      <span className="text-gray-400 text-xs block mb-1">Foto da sua redação:</span>
                      <img
                        src={ans.essay_image_base64}
                        alt="Foto da redação"
                        className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50"
                      />
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 mb-2">
                    <span className="text-gray-400 text-xs block mb-1">
                      {ans.essay_image_base64 ? 'Transcrição da IA:' : 'Sua resposta:'}
                    </span>
                    <span className="whitespace-pre-wrap">{ans.essay_text || <span className="italic text-gray-400">Sem resposta</span>}</span>
                  </div>
                  {ans.ai_feedback && (
                    <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                      <span className="text-xs font-medium text-blue-500 block mb-1">Feedback:</span>
                      {ans.ai_feedback}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
