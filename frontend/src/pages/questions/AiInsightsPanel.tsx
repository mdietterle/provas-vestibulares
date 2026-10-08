import type { Question } from '../../types'

interface Props {
  questions: Question[]
}

export default function AiInsightsPanel({ questions }: Props) {
  const counts = {
    mc: questions.filter(q => q.question_type === 'multiple_choice').length,
    tf: questions.filter(q => q.question_type === 'true_false').length,
    essay: questions.filter(q => q.question_type === 'essay').length,
    summ: questions.filter(q => q.question_type === 'summation').length,
  }

  return (
    <div className="rounded-2xl border p-5 bg-gradient-to-br from-teal-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 border-teal-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-500 to-teal-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">Análise do Banco</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium bg-teal-100 dark:bg-slate-700 text-amber-500 dark:text-amber-400">IA</span>
      </div>
      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="bg-white dark:bg-slate-700 rounded-xl p-3 border border-teal-200 dark:border-slate-600">
          <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{questions.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total</p>
        </div>
        <div className="bg-white dark:bg-slate-700 rounded-xl p-3 border border-teal-200 dark:border-slate-600">
          <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
            {questions.length > 0 ? Math.round((counts.mc / questions.length) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Múltipla Escolha</p>
        </div>
        <div className="bg-white dark:bg-slate-700 rounded-xl p-3 border border-teal-200 dark:border-slate-600">
          <p className="text-lg font-bold text-[#27c38a] dark:text-[#4ade80]">
            {questions.filter(q => q.is_public).length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Públicas</p>
        </div>
        <div className="bg-white dark:bg-slate-700 rounded-xl p-3 border border-teal-200 dark:border-slate-600">
          <p className="text-lg font-bold text-[#ef4444] dark:text-red-400">
            {questions.length > 0 ? Math.round((questions.filter(q => q.difficulty === 'hard').length / questions.length) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Difíceis</p>
        </div>
      </div>
    </div>
  )
}