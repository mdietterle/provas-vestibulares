import { useState } from 'react'
import toast from 'react-hot-toast'
import { feedbackApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

/** Janela flutuante recolhível (canto inferior direito) pra reportar
 * problemas durante a fase de testes. Presente em toda página, pública
 * ou privada, montada uma única vez em App.tsx fora das rotas. */
export default function FeedbackWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    try {
      await feedbackApi.send({
        message: message.trim(),
        page_url: window.location.href,
        reporter_email: user?.email ?? null,
      })
      toast.success('Obrigado! Seu reporte foi enviado.')
      setMessage('')
      setOpen(false)
    } catch {
      toast.error('Não foi possível enviar. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Reportar problema"
        title="Reportar problema"
        className="fixed bottom-5 right-5 z-[70] w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg hover:-translate-y-0.5 transition-transform"
        style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', boxShadow: '0 8px 24px rgba(0,35,111,0.3)' }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a3 3 0 116 0v2M9 7h6M9 7a4 4 0 00-4 4M15 7a4 4 0 014 4M5 11v4a7 7 0 0014 0v-4M5 11H3M19 11h2M5 15H3M19 15h2M8.5 9l-2-2M15.5 9l2-2M12 11v6" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70] w-80 max-w-[calc(100vw-2.5rem)] bg-white dark:bg-[#1d1f27] rounded-2xl border border-[#E2E8F0] dark:border-[#464554] shadow-2xl overflow-hidden"
      style={{ boxShadow: '0 12px 40px rgba(0,35,111,0.25)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}>
        <span className="text-sm font-semibold text-white">Reportar problema</span>
        <button onClick={() => setOpen(false)} aria-label="Fechar" className="text-white/80 hover:text-white">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <p className="text-xs text-slate-500 dark:text-slate-300">
          Descreva o problema ou sugestão. Enviamos direto para a equipe.
        </p>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="O que aconteceu?"
          className="w-full text-sm rounded-lg border border-[#E2E8F0] dark:border-slate-300 bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e2e8f0] p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
          autoFocus
        />
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="w-full py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
        >
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  )
}
