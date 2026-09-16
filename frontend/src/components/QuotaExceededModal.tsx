import { ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline'
import Modal from './Modal'

interface QuotaExceededModalProps {
  resource: 'ai_generation' | 'ai_correction'
  used: number
  limit: number
  onClose: () => void
  onContactSupport?: () => void
}

const RESOURCE_LABELS: Record<string, { title: string; unit: string; price: string; pkg: string }> = {
  ai_generation: {
    title: 'Geração de questões por IA',
    unit: 'gerações',
    price: 'R$ 39',
    pkg: '100 questões geradas',
  },
  ai_correction: {
    title: 'Correção de redações por IA',
    unit: 'correções',
    price: 'R$ 59',
    pkg: '200 correções de redação',
  },
}

export default function QuotaExceededModal({
  resource,
  used,
  limit,
  onClose,
  onContactSupport,
}: QuotaExceededModalProps) {
  const info = RESOURCE_LABELS[resource]
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100

  return (
    <Modal title="Limite do plano atingido" onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
          <ExclamationTriangleIcon className="w-7 h-7 text-amber-500" />
        </div>

        <div>
          <p className="font-semibold text-gray-800">{info.title}</p>
          <p className="text-sm text-gray-500 mt-1">
            Você usou <span className="font-bold text-gray-700">{used}</span> de{' '}
            <span className="font-bold text-gray-700">{limit}</span> {info.unit} disponíveis neste mês.
          </p>
        </div>

        {/* barra de progresso */}
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full bg-red-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="w-full bg-blue-50 border border-blue-100 rounded-lg p-4 text-left">
          <div className="flex items-start gap-3">
            <SparklesIcon className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Pacote avulso disponível</p>
              <p className="text-sm text-blue-600 mt-0.5">
                {info.pkg} por <span className="font-bold">{info.price}</span>
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Os créditos avulsos não expiram e são debitados após o limite mensal.
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Seu limite reinicia no primeiro dia do próximo mês.
        </p>

        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onContactSupport ?? onClose}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Solicitar pacote avulso
          </button>
        </div>
      </div>
    </Modal>
  )
}
