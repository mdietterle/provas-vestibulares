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
    <div className="rounded-2xl border p-5 bg-gradient-to-br from-[#f5f0ff] to-[#eef2ff] dark:from-[#1a1530] dark:to-[#272a32] border-[#e0d9ff] dark:border-[#332a5c]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#712ae2] to-[#4f46e5]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-[#4f46e5] dark:text-[#818CF8]">Análise do Banco</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium bg-[#ede9fe] dark:bg-[#2a2050] text-[#712ae2] dark:text-[#b8a5ff]">IA</span>
      </div>
      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="bg-white dark:bg-[#464554] rounded-xl p-3 border border-[#e0d9ff] dark:border-[#332a5c]">
          <p className="text-lg font-bold text-[#4f46e5] dark:text-[#818CF8]">{questions.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total</p>
        </div>
        <div className="bg-white dark:bg-[#464554] rounded-xl p-3 border border-[#e0d9ff] dark:border-[#332a5c]">
          <p className="text-lg font-bold text-[#4f46e5] dark:text-[#818CF8]">
            {questions.length > 0 ? Math.round((counts.mc / questions.length) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Múltipla Escolha</p>
        </div>
        <div className="bg-white dark:bg-[#464554] rounded-xl p-3 border border-[#e0d9ff] dark:border-[#332a5c]">
          <p className="text-lg font-bold text-[#27c38a] dark:text-[#4ade80]">
            {questions.filter(q => q.is_public).length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Públicas</p>
        </div>
        <div className="bg-white dark:bg-[#464554] rounded-xl p-3 border border-[#e0d9ff] dark:border-[#332a5c]">
          <p className="text-lg font-bold text-[#ef4444] dark:text-red-400">
            {questions.length > 0 ? Math.round((questions.filter(q => q.difficulty === 'hard').length / questions.length) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Difíceis</p>
        </div>
      </div>
    </div>
  )
}