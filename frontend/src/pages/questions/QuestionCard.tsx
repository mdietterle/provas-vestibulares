import { Question } from '../../types'
import { useAuth } from '../../contexts/AuthContext'

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Múltipla Escolha',
  true_false: 'Verdadeiro/Falso',
  essay: 'Dissertativa',
  summation: 'Somatório',
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  multiple_choice: { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
  true_false: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  essay: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  summation: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
}
const TYPE_COLORS_DEFAULT = { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' }

const DIFFICULTY_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  easy:   { label: 'Fácil',  bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  medium: { label: 'Médio',  bg: 'bg-slate-100 dark:bg-slate-900/30', text: 'text-slate-800 dark:text-slate-400', dot: 'bg-orange-500' },
  hard:   { label: 'Difícil', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

interface Props {
  q: Question
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function QuestionCard({ q, isExpanded, onToggleExpand, onEdit, onDelete }: Props) {
  const { user } = useAuth()
  const typeStyle = TYPE_COLORS[q.question_type] || TYPE_COLORS_DEFAULT
  const diffCfg = DIFFICULTY_CONFIG[q.difficulty || 'medium']
  const canEdit = q.professor_id === user?.id || user?.role === 'admin'

  return (
    <div className="rounded-2xl border bg-white dark:bg-[#464554] border-[#E2E8F0] dark:border-[#464554] overflow-hidden transition-all">
      <div className="flex items-start gap-4 p-4">
        {/* Type icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${typeStyle.bg} ${typeStyle.text}`}>
          {q.question_type === 'multiple_choice' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
            </svg>
          )}
          {q.question_type === 'true_false' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          )}
          {q.question_type === 'essay' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          )}
          {q.question_type === 'summation' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7V4h16v3L12 13l8 6v3H4v-3l8-6L4 7z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {q.subject.name}
            </span>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
              {TYPE_LABELS[q.question_type]}
            </span>
            {diffCfg && (
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 ${diffCfg.bg} ${diffCfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${diffCfg.dot}`} />
                {diffCfg.label}
              </span>
            )}
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${q.is_public ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
              {q.is_public ? 'Pública' : 'Privada'}
            </span>
            {q.professor_id !== user?.id && (
              <span className="text-xs text-gray-400">por {q.professor.name}</span>
            )}
          </div>

          <p className={`text-sm text-gray-800 dark:text-gray-200 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
            {q.statement}
          </p>

          {q.image_base64 && isExpanded && (
            <img src={`data:image/jpeg;base64,${q.image_base64}`} alt="Imagem da questão" className="mt-3 rounded-lg max-h-64 object-contain border border-[#E2E8F0]" />
          )}

          {!isExpanded && q.options.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {q.question_type === 'summation' ? (
                <span className="text-xs px-2 py-0.5 rounded-lg border font-semibold font-mono bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/40">
                  Resposta: {String(q.options.filter(o => o.is_correct).reduce((acc, o) => acc + o.order, 0)).padStart(2, '0')}
                </span>
              ) : (
                q.options.sort((a, b) => a.order - b.order).map((o, i) => (
                  <span key={o.id} className={`text-xs px-2 py-0.5 rounded-lg border ${o.is_correct ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40 font-semibold' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                    {OPTION_LETTERS[i] || (i + 1)}. {o.text.length > 30 ? o.text.slice(0, 30) + '…' : o.text}
                    {o.is_correct && ' ✓'}
                  </span>
                ))
              )}
            </div>
          )}

          {isExpanded && q.options.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {q.question_type === 'summation' && (
                <div className="mb-2 px-3 py-2 rounded-lg border text-sm font-semibold font-mono bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-300">
                  Resposta: {String(q.options.filter(o => o.is_correct).reduce((acc, o) => acc + o.order, 0)).padStart(2, '0')}
                </div>
              )}
              {q.options.sort((a, b) => a.order - b.order).map((o, i) => (
                <div key={o.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm ${o.is_correct ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${o.is_correct ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>
                    {q.question_type === 'summation' ? String(o.order).padStart(2, '0') : (OPTION_LETTERS[i] || (i + 1))}
                  </span>
                  <span className={o.is_correct ? 'font-medium' : ''}>{o.text}</span>
                  {o.is_correct && (
                    <svg className="ml-auto text-green-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onToggleExpand} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" title={isExpanded ? 'Recolher' : 'Expandir'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isExpanded ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
            </svg>
          </button>
          {canEdit && (
            <>
              <button onClick={onEdit} className="p-2 rounded-lg text-gray-400 hover:bg-slate-50 hover:text-slate-600 transition-colors" title="Editar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button onClick={onDelete} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Excluir">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}