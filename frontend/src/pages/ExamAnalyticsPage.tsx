import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { submissionsApi } from '../api/submissions'
import { exportAnalytics } from '../utils/pdf'

interface StudentRef { id: number; name: string }
interface PlagiarismAlert {
  student_a: StudentRef
  student_b: StudentRef
  type: 'multiple_choice' | 'essay'
  similarity: number
  evidence: string
}
interface QuestionStat {
  exam_question_id: number
  order: number
  statement: string
  question_type: string
  points: number
  correct_count: number
  wrong_count: number
  skip_count: number
  avg_score: number | null
  error_rate: number
}
interface DistBucket { label: string; count: number }
interface Analytics {
  exam_id: number
  exam_title: string
  total_points: number
  total_enrolled: number
  total_submitted: number
  corrected_count: number
  average_score: number | null
  median_score: number | null
  highest_score: number | null
  lowest_score: number | null
  std_dev: number
  pass_rate: number
  score_distribution: DistBucket[]
  question_stats: QuestionStat[]
  plagiarism_alerts: PlagiarismAlert[]
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5 flex flex-col gap-1">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold text-gray-800">{value}</span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  )
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
    </div>
  )
}

function errorColor(rate: number) {
  if (rate >= 0.7) return 'text-red-600 font-bold'
  if (rate >= 0.4) return 'text-yellow-600 font-semibold'
  return 'text-green-600'
}

function SimilarityBadge({ sim }: { sim: number }) {
  const pct = Math.round(sim * 100)
  const cls = pct >= 80
    ? 'bg-red-100 text-red-700 border-red-200'
    : 'bg-yellow-100 text-yellow-700 border-yellow-200'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {pct}% similar
    </span>
  )
}

export default function ExamAnalyticsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    submissionsApi.analytics(+id)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Erro ao carregar analytics'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-gray-400 py-20 text-center">Carregando análise...</div>
  if (error) return <div className="text-red-500 py-20 text-center">{error}</div>
  if (!data) return null

  const maxBucket = Math.max(...data.score_distribution.map(b => b.count), 1)
  const maxError = Math.max(...data.question_stats.map(q => q.error_rate), 0.01)

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/exams/${id}/submissions`)} className="btn-secondary btn-sm">
            ← Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold">Análise da Prova</h1>
            <p className="text-gray-500 text-sm">{data.exam_title}</p>
          </div>
        </div>
        <button
          onClick={() => exportAnalytics(data)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-[#E2E8F0] bg-white text-[#4f46e5] hover:bg-[#EFF6FF] transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Exportar Relatório PDF
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Média da turma"
          value={data.average_score != null ? `${data.average_score} / ${data.total_points}` : '—'}
          sub={`Mediana: ${data.median_score ?? '—'}`}
        />
        <StatCard
          label="Taxa de aprovação"
          value={`${data.pass_rate}%`}
          sub="(≥ 50% da nota total)"
        />
        <StatCard
          label="Maior / Menor nota"
          value={data.highest_score != null ? `${data.highest_score} / ${data.lowest_score}` : '—'}
          sub={`Desvio padrão: ${data.std_dev}`}
        />
        <StatCard
          label="Entregas corrigidas"
          value={`${data.corrected_count} / ${data.total_submitted}`}
          sub={`${data.total_enrolled} matriculados`}
        />
      </div>

      {/* Grade distribution */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 mb-5">Distribuição de Notas</h2>
        <div className="space-y-3">
          {data.score_distribution.map(bucket => (
            <div key={bucket.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-16 shrink-0">{bucket.label}</span>
              <div className="flex-1">
                <Bar pct={(bucket.count / maxBucket) * 100} color="bg-blue-500" />
              </div>
              <span className="text-xs font-semibold text-gray-600 w-6 text-right">{bucket.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-question performance */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-700">Desempenho por Questão</h2>
          <p className="text-xs text-gray-400 mt-0.5">Questões com maior taxa de erro indicam conteúdo que merece revisão</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Q</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Questão</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Tipo</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Acertos</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Erros</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Brancos</th>
                <th className="px-6 py-3 text-gray-500 font-medium w-40">Taxa de erro</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.question_stats.map(q => (
                <tr key={q.exam_question_id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-semibold text-gray-400">{q.order}</td>
                  <td className="px-6 py-3 max-w-xs">
                    <span className="line-clamp-2 text-gray-700">{q.statement}</span>
                  </td>
                  <td className="px-6 py-3 text-gray-400 whitespace-nowrap">
                    {q.question_type === 'essay' ? 'Dissertativa' :
                      q.question_type === 'true_false' ? 'V/F' : 'M. Escolha'}
                  </td>
                  <td className="px-4 py-3 text-center text-green-600 font-semibold">{q.correct_count}</td>
                  <td className="px-4 py-3 text-center text-red-500 font-semibold">{q.wrong_count}</td>
                  <td className="px-4 py-3 text-center text-gray-400">{q.skip_count}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Bar pct={(q.error_rate / maxError) * 100} color={
                          q.error_rate >= 0.7 ? 'bg-red-500' :
                          q.error_rate >= 0.4 ? 'bg-yellow-400' : 'bg-green-400'
                        } />
                      </div>
                      <span className={`text-xs w-10 text-right ${errorColor(q.error_rate)}`}>
                        {Math.round(q.error_rate * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plagiarism alerts */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-700">Alertas de Cola</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Pares com respostas suspeita­mente similares — revise antes de tomar qualquer decisão
            </p>
          </div>
          {data.plagiarism_alerts.length > 0 && (
            <span className="text-xs font-semibold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
              {data.plagiarism_alerts.length} suspeito{data.plagiarism_alerts.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {data.plagiarism_alerts.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            Nenhum indício de cola detectado
          </div>
        ) : (
          <div className="divide-y">
            {data.plagiarism_alerts.map((alert, i) => (
              <div key={i} className="px-6 py-4 flex items-start gap-4">
                <div className="mt-0.5 w-2 h-2 rounded-full shrink-0 mt-2"
                  style={{ background: alert.similarity >= 0.8 ? '#ef4444' : '#f59e0b' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{alert.student_a.name}</span>
                    <span className="text-gray-400 text-xs">e</span>
                    <span className="font-semibold text-gray-800">{alert.student_b.name}</span>
                    <SimilarityBadge sim={alert.similarity} />
                    <span className="text-xs text-gray-400 capitalize">
                      ({alert.type === 'essay' ? 'dissertativa' : 'múltipla escolha'})
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{alert.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
