import { useEffect, useState } from 'react'
import { subjectsApi, itaApi } from '../api'
import type { ItaQuestion } from '../api/ita'
import type { Subject } from '../types'

const LETTERS = 'ABCDE'

const AREA_COLORS: Record<string, string> = {
  'Matemática': 'bg-orange-100 text-orange-700',
  'Física': 'bg-teal-100 text-teal-700',
  'Química': 'bg-pink-100 text-pink-700',
  'Inglês': 'bg-cyan-100 text-cyan-700',
  'Português': 'bg-blue-100 text-blue-700',
  'Geral': 'bg-gray-100 text-gray-600',
}

function AreaBadge({ area }: { area: string | null }) {
  const cls = area ? (AREA_COLORS[area] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-400'
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{area ?? 'Geral'}</span>
}

interface ImportModalProps {
  question: ItaQuestion
  subjects: Subject[]
  onClose: () => void
  onSuccess: () => void
}

function ImportModal({ question, subjects, onClose, onSuccess }: ImportModalProps) {
  const [subjectId, setSubjectId] = useState<number | ''>(subjects[0]?.id ?? '')
  const [difficulty, setDifficulty] = useState('medium')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleImport() {
    if (!subjectId) { setError('Selecione uma matéria.'); return }
    setLoading(true)
    setError('')
    try {
      await itaApi.importQuestion({
        ita_question_id: question.id,
        subject_id: subjectId as number,
        difficulty,
        is_public: isPublic,
      })
      onSuccess()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail ?? 'Erro ao importar questão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Importar para meu banco</h2>
        <p className="text-sm text-gray-500 mb-5">
          {question.exam_name} – Q{question.number}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Matéria</label>
            <select
              value={subjectId}
              onChange={e => setSubjectId(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="easy">Fácil</option>
              <option value="medium">Médio</option>
              <option value="hard">Difícil</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-700">Tornar pública para minha escola</span>
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 btn-secondary py-2 text-sm">Cancelar</button>
          <button
            onClick={handleImport}
            disabled={loading}
            className="flex-1 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-[#001a54] transition-colors disabled:opacity-50"
          >
            {loading ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface QuestionCardProps {
  question: ItaQuestion
  onImport: () => void
  expanded: boolean
  onToggle: () => void
}

function QuestionCard({ question, onImport, expanded, onToggle }: QuestionCardProps) {
  const hasAnswer = !!question.answer
  const imgs = [
    ...(question.image_base64 ? [question.image_base64] : []),
    ...question.images.map(img => img.image_base64)
  ].map(src => src.startsWith('data:') ? src : `data:image/png;base64,${src}`)

  return (
    <div className="card border border-gray-100 hover:border-[#c7d7ff] dark:hover:border-[#1e2d4a] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="shrink-0 w-9 h-9 rounded-full bg-[#EFF6FF] flex items-center justify-center text-sm font-bold text-teal-600">
            {question.number}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-xs font-semibold text-gray-500">{question.exam_name}</span>
              {question.area && <AreaBadge area={question.area} />}
              {question.phase && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  Fase {question.phase}
                </span>
              )}
              {question.question_type === 'discursive' && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  Dissertativa
                </span>
              )}
              {!hasAnswer && question.question_type === 'multiple_choice' && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                  Gabarito a confirmar
                </span>
              )}
            </div>
            <p className={`text-sm text-gray-700 leading-relaxed whitespace-pre-line ${expanded ? '' : 'line-clamp-3'}`}>
              {question.statement}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onImport}
            title="Importar para meu banco"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#EFF6FF] dark:bg-slate-800 text-teal-600 dark:text-teal-400 hover:bg-[#dde9ff] dark:hover:bg-[#1e2d4a] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Importar
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            title={expanded ? 'Recolher' : 'Expandir'}
          >
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {imgs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {imgs.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Imagem ${i + 1} da questão ${question.number}`}
                  className="max-w-full max-h-64 rounded-lg border object-contain"
                />
              ))}
            </div>
          )}
          {question.question_type === 'multiple_choice' ? (
            <div className="space-y-2">
              {[...question.options].sort((a, b) => a.order - b.order).map((opt, i) => (
                <div
                  key={opt.id}
                  className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                    opt.is_correct
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="font-bold w-5 shrink-0">{LETTERS[i]})</span>
                  <span className="flex-1 whitespace-pre-line">{opt.text}</span>
                  {opt.is_correct && (
                    <span className="text-green-600 text-xs font-bold shrink-0">✓ Correta</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <span className="text-xs font-bold text-teal-800 block mb-1">Gabarito Dissertativo / Critério</span>
              <p className="text-sm text-teal-800">
                {question.answer ? question.answer : 'Esta questão é dissertativa e não possui alternativa correta objetiva.'}
              </p>
            </div>
          )}
          {!hasAnswer && question.question_type === 'multiple_choice' && (
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              O gabarito desta questão não pôde ser confirmado automaticamente. Confira a resposta correta ao usar a questão.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function ItaBankPage() {
  const [questions, setQuestions] = useState<ItaQuestion[]>([])
  const [years, setYears] = useState<number[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [filterYear, setFilterYear] = useState<string>('')
  const [filterArea, setFilterArea] = useState<string>('')
  const [filterPhase, setFilterPhase] = useState<string>('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState<ItaQuestion | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 30

  useEffect(() => {
    Promise.all([itaApi.years(), itaApi.areas(), subjectsApi.list()])
      .then(([y, a, s]) => {
        setYears(y.data)
        setAreas(a.data)
        setSubjects(s.data)
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    itaApi.list({
      year: filterYear ? Number(filterYear) : undefined,
      phase: filterPhase || undefined,
      area: filterArea || undefined,
      search: search || undefined,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    }).then(r => {
      setQuestions(r.data)
    }).finally(() => setLoading(false))
  }, [filterYear, filterArea, filterPhase, search, page])

  function handleSearch() {
    setSearch(searchInput)
    setPage(0)
  }

  function handleImportSuccess() {
    setImporting(null)
    setSuccessMsg('Questão importada com sucesso para o seu banco!')
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banco ITA</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Questões dos vestibulares do ITA (Instituto Tecnológico de Aeronáutica) disponíveis para todos os professores.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-amber-500 text-white text-sm font-semibold shadow">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
            {questions.length > 0 || !loading ? `${questions.length}${questions.length === PAGE_SIZE ? '+' : ''} questões` : '...'}
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Filters row */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center flex-1 min-w-[280px]">
            <div className="w-44">
              <select
                value={filterYear}
                onChange={e => { setFilterYear(e.target.value); setPage(0) }}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="">Todos os anos</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="w-44">
              <select
                value={filterArea}
                onChange={e => { setFilterArea(e.target.value); setPage(0) }}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="">Todas as matérias</option>
                {areas.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="w-44">
              <select
                value={filterPhase}
                onChange={e => { setFilterPhase(e.target.value); setPage(0) }}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="">Todas as fases</option>
                <option value="1">1ª Fase</option>
                <option value="2">2ª Fase</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 flex-1 max-w-md min-w-[240px]">
            <input
              type="text"
              placeholder="Pesquisar por enunciado..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button onClick={handleSearch} className="px-4 py-2 bg-teal-600 hover:bg-[#001a54] text-white text-sm font-semibold rounded-lg transition-colors">
              Buscar
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 dark:border-teal-400"></div>
        </div>
      ) : questions.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          Nenhuma questão encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {questions.map(q => (
              <QuestionCard
                key={q.id}
                question={q}
                onImport={() => setImporting(q)}
                expanded={expanded.has(q.id)}
                onToggle={() => toggleExpand(q.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500">Página {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={questions.length < PAGE_SIZE}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {importing && (
        <ImportModal
          question={importing}
          subjects={subjects}
          onClose={() => setImporting(null)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  )
}
