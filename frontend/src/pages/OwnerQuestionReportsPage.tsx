import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  ownerQuestionReportsApi,
  type QuestionReportGroup,
  type ReportedQuestionDetail,
  type QuestionReportOption,
} from '../api'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'

function ReviewModal({
  group,
  onClose,
  onResolved,
}: {
  group: QuestionReportGroup
  onClose: () => void
  onResolved: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<ReportedQuestionDetail | null>(null)
  const [statement, setStatement] = useState('')
  const [options, setOptions] = useState<QuestionReportOption[]>([])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    ownerQuestionReportsApi.detail(group.exam_type, group.question_id)
      .then(({ data }) => {
        setDetail(data)
        setStatement(data.question.statement)
        setOptions(data.question.options)
      })
      .catch(() => toast.error('Não foi possível carregar a questão.'))
      .finally(() => setLoading(false))
  }, [group.exam_type, group.question_id])

  const handleSaveAndRelease = async () => {
    setSaving(true)
    try {
      await ownerQuestionReportsApi.updateQuestion(group.exam_type, group.question_id, {
        statement,
        options: options.map(o => ({ id: o.id, text: o.text, is_correct: o.is_correct })),
      })
      await ownerQuestionReportsApi.release(group.exam_type, group.question_id)
      toast.success('Questão corrigida e liberada — volta a ser sorteada em novos simulados.')
      onResolved()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleReleaseOnly = async () => {
    setSaving(true)
    try {
      await ownerQuestionReportsApi.release(group.exam_type, group.question_id)
      toast.success('Liberada sem alterações.')
      onResolved()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Não foi possível liberar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await ownerQuestionReportsApi.deleteQuestion(group.exam_type, group.question_id)
      toast.success('Questão excluída permanentemente.')
      onResolved()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Não foi possível excluir.')
    } finally {
      setSaving(false)
      setConfirmDelete(false)
    }
  }

  return (
    <Modal title={`Revisar questão — ${group.exam_type.toUpperCase()} #${group.question_id}`} onClose={onClose} size="lg">
      {loading || !detail ? (
        <p className="text-sm text-[#64748B]">Carregando...</p>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">
              Denúncias ({detail.reports.length})
            </p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {detail.reports.map(r => (
                <div key={r.id} className="text-xs bg-[#F4F6F9] dark:bg-[#0F172A] rounded-lg p-2">
                  <span className="font-semibold text-[#1E293B] dark:text-[#f8fafc]">{r.reason}</span>
                  {r.details && <span className="text-[#64748B] dark:text-[#94a3b8]"> — {r.details}</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#334155] dark:text-[#94a3b8] uppercase tracking-wide mb-1">
              Enunciado — como aparece pro aluno
            </label>
            <div
              className="text-sm text-[#1E293B] dark:text-[#e2e8f0] leading-relaxed prose prose-sm max-w-none border border-[#E2E8F0] dark:border-[#1e2d4a] rounded-lg p-3 bg-[#F4F6F9] dark:bg-[#0F172A] mb-2 max-h-48 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: statement }}
            />
            <label className="block text-xs font-semibold text-[#334155] dark:text-[#94a3b8] uppercase tracking-wide mb-1">
              HTML bruto (editável)
            </label>
            <textarea
              value={statement}
              onChange={e => setStatement(e.target.value)}
              rows={6}
              className="w-full text-sm border border-[#c5c5d3] dark:border-[#1e2d4a] rounded-lg p-3 bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#e2e8f0] focus:outline-none focus:border-[#4f46e5] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#334155] dark:text-[#94a3b8] uppercase tracking-wide mb-1">
              Alternativas
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={opt.id} className="flex items-start gap-2">
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-[#EEF2F7] dark:bg-[#1a2947] flex items-center justify-center text-xs font-bold text-[#334155] dark:text-[#cbd5e1] mt-0.5">
                    {opt.letter}
                  </span>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => setOptions(prev => prev.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
                    className="flex-1 text-sm border border-[#c5c5d3] dark:border-[#1e2d4a] rounded-lg px-3 py-2 bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#e2e8f0] focus:outline-none focus:border-[#4f46e5]"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-[#94a3b8] shrink-0 mt-2">
                    <input
                      type="checkbox"
                      checked={opt.is_correct}
                      onChange={e => setOptions(prev => prev.map((o, j) => j === i ? { ...o, is_correct: e.target.checked } : o))}
                    />
                    correta
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-2 pt-3 border-t border-[#E2E8F0] dark:border-[#1e2d4a]">
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              Excluir questão permanentemente
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleReleaseOnly}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#4f46e5] dark:text-[#818CF8] border border-[#dce1ff] dark:border-[#2a3a63] hover:bg-[#EFF6FF] dark:hover:bg-[#1a2947] transition-colors disabled:opacity-50"
              >
                Liberar sem alterar
              </button>
              <button
                onClick={handleSaveAndRelease}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#4f46e5] hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar e liberar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Excluir esta questão em definitivo? Não pode ser desfeito — ela some do banco e de qualquer simulado futuro."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </Modal>
  )
}

export default function OwnerQuestionReportsPage() {
  const [groups, setGroups] = useState<QuestionReportGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<QuestionReportGroup | null>(null)

  const load = () => {
    setLoading(true)
    ownerQuestionReportsApi.list('pending').then(({ data }) => setGroups(data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0F172A]">
      <div className="bg-white dark:bg-[#131f37] border-b border-[#E2E8F0] dark:border-[#1e2d4a] px-6 py-4">
        <h1 className="text-xl font-bold text-[#1E293B] dark:text-[#f8fafc]">Questões Reportadas</h1>
        <p className="text-sm text-[#64748B] dark:text-[#94a3b8]">
          Questões que alunos reportaram como problemáticas — saem do sorteio de novos simulados até serem revisadas aqui.
        </p>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white dark:bg-[#131f37] rounded-2xl border border-[#E2E8F0] dark:border-[#1e2d4a] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] dark:border-[#1e2d4a] bg-[#F4F6F9] dark:bg-[#0F172A]">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-[#94a3b8] uppercase tracking-wide">Banco</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-[#94a3b8] uppercase tracking-wide">Enunciado</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-[#94a3b8] uppercase tracking-wide">Denúncias</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] dark:text-[#94a3b8] uppercase tracking-wide">Motivos</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[#64748B] dark:text-[#94a3b8] uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1e2d4a]">
                  {groups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-[#64748B] dark:text-[#94a3b8] text-sm">
                        Nenhuma questão reportada pendente — tudo em ordem.
                      </td>
                    </tr>
                  ) : groups.map(g => (
                    <tr key={`${g.exam_type}-${g.question_id}`} className="hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-bold uppercase text-[#712ae2] dark:text-[#818CF8]">{g.exam_type}</span>
                        <div className="text-xs text-[#a0a3af]">#{g.question_id}</div>
                      </td>
                      <td className="px-4 py-3.5 text-[#334155] dark:text-[#94a3b8] max-w-md">
                        <p className="line-clamp-2">{g.statement_preview}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center font-semibold text-[#1E293B] dark:text-[#f8fafc]">{g.count}</td>
                      <td className="px-4 py-3.5 text-xs text-[#64748B] dark:text-[#94a3b8] max-w-xs">
                        {[...new Set(g.reasons)].join(', ')}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setReviewing(g)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#4f46e5] text-white hover:bg-[#1D4ED8] transition-colors"
                        >
                          Revisar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {reviewing && (
        <ReviewModal
          group={reviewing}
          onClose={() => setReviewing(null)}
          onResolved={() => { setReviewing(null); load() }}
        />
      )}
    </div>
  )
}
