import { useState } from 'react'
import { Link } from 'react-router-dom'
import AdSlot from '../components/AdSlot'
import Seo from '../components/Seo'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'
import Breadcrumb from '../components/Breadcrumb'

const ADSENSE_SLOT_PUBLIC = (import.meta.env.VITE_ADSENSE_SLOT_PUBLIC as string | undefined) || ''

const TOPICS = [
  'Como funciona a correção por IA?',
  'Integração com Google Classroom',
  'Migração de dados de outra plataforma',
  'Segurança e privacidade dos dados',
  'Suporte técnico e onboarding',
  'Agendar demonstração',
  'Dúvida sobre faturamento',
  'Outro assunto',
]

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    institution: '',
    topic: '',
    message: '',
    preferred_contact: 'email',
    phone: '',
    best_time: '',
  })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#10131a] font-sans">
      <Seo
        title="Fale conosco — Cognition AI"
        description="Entre em contato com o time do Cognition AI para dúvidas sobre a plataforma, suporte técnico ou parcerias com escolas."
        path="/contact"
      />
      <PublicHeader />

      <div className="max-w-5xl mx-auto px-6 pt-8">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Contato' }]} />
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-14 grid lg:grid-cols-5 gap-12">
        {/* Left — info */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 bg-[#dce1ff] dark:bg-[#272a32] text-[#4f46e5] dark:text-[#818CF8]">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Falar com Especialista
            </span>
            <h1 className="font-display text-2xl font-bold text-[#1E293B] leading-tight mb-3">
              Tire suas dúvidas com quem entende de educação e tecnologia
            </h1>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Nossos especialistas em edtech estão prontos para responder qualquer pergunta sobre a plataforma, integrações ou como a IA pode se encaixar na sua rotina pedagógica.
            </p>
          </div>

          {/* Contact channels */}
          <div className="space-y-3">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'E-mail',
                value: 'contato@aiassessmenthub.com.br',
                sub: 'Respondemos em até 4h em dias úteis',
                cls: 'bg-[#dce1ff] dark:bg-[#272a32] text-[#4f46e5] dark:text-[#818CF8]',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
                title: 'WhatsApp',
                value: '(11) 9 9999-0000',
                sub: 'Seg–Sex, 8h–18h',
                cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'Videochamada',
                value: 'Agende uma demo',
                sub: 'Demonstração gratuita de 30 min',
                cls: 'bg-[#eef2ff] dark:bg-[#272a32] text-[#4f46e5] dark:text-[#818CF8]',
              },
            ].map(c => (
              <div key={c.title} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.cls}`}>
                  {c.icon}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#334155] dark:text-[#c7c4d7] uppercase tracking-wide">{c.title}</p>
                  <p className="text-sm font-medium text-[#1E293B]">{c.value}</p>
                  <p className="text-xs text-[#64748B]">{c.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Topics quick-select */}
          <div className="rounded-xl border border-[#E2E8F0] p-4 bg-white dark:bg-[#1d1f27]">
            <p className="text-xs font-semibold text-[#334155] dark:text-[#c7c4d7] uppercase tracking-wide mb-3">Perguntas mais comuns</p>
            <div className="flex flex-wrap gap-1.5">
              {TOPICS.slice(0, 6).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, topic: t }))}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    form.topic === t
                      ? 'bg-[#4f46e5] dark:bg-[#3355c9] text-white border-[#4f46e5] dark:border-[#3355c9]'
                      : 'bg-[#F4F6F9] dark:bg-[#272a32] text-[#334155] dark:text-[#c7c4d7] border-[#E2E8F0] dark:border-[#464554]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-4 py-3 bg-[#F4F6F9] dark:bg-[#272a32] border-b border-[#E2E8F0]">
              <p className="text-xs font-semibold text-[#334155] dark:text-[#c7c4d7] uppercase tracking-wide">Horário de atendimento</p>
            </div>
            {[
              { day: 'Segunda – Sexta', hours: '08:00 – 18:00' },
              { day: 'Sábado', hours: '09:00 – 13:00' },
              { day: 'Domingo / Feriados', hours: 'Somente e-mail' },
            ].map(h => (
              <div key={h.day} className="flex justify-between px-4 py-2.5 border-b border-[#f0f0f8] dark:border-[#464554] last:border-b-0 bg-white dark:bg-[#1d1f27]">
                <span className="text-xs text-[#64748B]">{h.day}</span>
                <span className="text-xs font-medium text-[#1E293B]">{h.hours}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div className="lg:col-span-3">
          {sent ? (
            <div className="bg-white dark:bg-[#1d1f27] rounded-2xl border border-[#E2E8F0] p-10 text-center" style={{ boxShadow: '0 4px 24px rgba(0,35,111,0.08)' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100 dark:bg-green-900/30">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#27c38a" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-display text-xl font-bold text-[#1E293B] mb-2">Mensagem enviada!</h2>
              <p className="text-sm text-[#64748B] leading-relaxed mb-6">
                Recebemos sua mensagem e um especialista entrará em contato pelo canal escolhido em até 4 horas (dias úteis).
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link to="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}>
                  Voltar ao início
                </Link>
                <Link to="/quote" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#4f46e5] dark:text-[#818CF8] border border-[#dce1ff] dark:border-[#2a3a63] bg-[#EFF6FF] dark:bg-[#272a32] hover:bg-[#E2E8F0] dark:hover:bg-[#20325a] transition-colors">
                  Solicitar orçamento
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1d1f27] rounded-2xl border border-[#E2E8F0] p-8 space-y-5" style={{ boxShadow: '0 4px 24px rgba(0,35,111,0.08)' }}>
              <h2 className="font-display text-lg font-bold text-[#1E293B]">Envie sua mensagem</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] dark:text-[#c7c4d7] uppercase tracking-wide mb-1.5">Nome *</label>
                  <input
                    required
                    className="w-full border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e1e2ec] placeholder-[#9ca3af] dark:placeholder-[#908fa0] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all"
                    placeholder="Seu nome"
                    value={form.name}
                    onChange={set('name')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] dark:text-[#c7c4d7] uppercase tracking-wide mb-1.5">E-mail *</label>
                  <input
                    required
                    type="email"
                    className="w-full border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e1e2ec] placeholder-[#9ca3af] dark:placeholder-[#908fa0] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all"
                    placeholder="voce@escola.edu.br"
                    value={form.email}
                    onChange={set('email')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] dark:text-[#c7c4d7] uppercase tracking-wide mb-1.5">Instituição</label>
                <input
                  className="w-full border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e1e2ec] placeholder-[#9ca3af] dark:placeholder-[#908fa0] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all"
                  placeholder="Nome da escola / rede (opcional)"
                  value={form.institution}
                  onChange={set('institution')}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] dark:text-[#c7c4d7] uppercase tracking-wide mb-1.5">Assunto *</label>
                <select
                  required
                  className="w-full border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e1e2ec] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all"
                  value={form.topic}
                  onChange={set('topic')}
                >
                  <option value="">Selecione o assunto...</option>
                  {TOPICS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] dark:text-[#c7c4d7] uppercase tracking-wide mb-1.5">Sua mensagem *</label>
                <textarea
                  required
                  rows={5}
                  className="w-full border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e1e2ec] placeholder-[#9ca3af] dark:placeholder-[#908fa0] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all resize-none"
                  placeholder="Descreva sua dúvida com o máximo de detalhes. Quanto mais contexto você fornecer, melhor poderemos ajudar."
                  value={form.message}
                  onChange={set('message')}
                />
              </div>

              {/* Preferred contact */}
              <div>
                <label className="block text-xs font-semibold text-[#334155] dark:text-[#c7c4d7] uppercase tracking-wide mb-2">Prefiro ser contactado por</label>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { value: 'email', label: 'E-mail' },
                    { value: 'whatsapp', label: 'WhatsApp' },
                    { value: 'videocall', label: 'Videochamada' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-all text-sm ${
                        form.preferred_contact === opt.value
                          ? 'border-[#4f46e5] dark:border-[#3355c9] bg-[#EFF6FF] dark:bg-[#272a32] text-[#4f46e5] dark:text-[#818CF8]'
                          : 'border-[#E2E8F0] dark:border-[#464554] bg-[#F4F6F9] dark:bg-[#10131a] text-[#334155] dark:text-[#c7c4d7]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="preferred_contact"
                        value={opt.value}
                        checked={form.preferred_contact === opt.value}
                        onChange={set('preferred_contact')}
                        className="accent-[#4f46e5]"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {(form.preferred_contact === 'whatsapp' || form.preferred_contact === 'videocall') && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {form.preferred_contact === 'whatsapp' && (
                    <div>
                      <label className="block text-xs font-semibold text-[#334155] dark:text-[#c7c4d7] uppercase tracking-wide mb-1.5">Número WhatsApp *</label>
                      <input
                        required
                        type="tel"
                        className="w-full border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e1e2ec] placeholder-[#9ca3af] dark:placeholder-[#908fa0] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all"
                        placeholder="(11) 9 0000-0000"
                        value={form.phone}
                        onChange={set('phone')}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] dark:text-[#c7c4d7] uppercase tracking-wide mb-1.5">Melhor horário</label>
                    <select
                      className="w-full border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e1e2ec] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all"
                      value={form.best_time}
                      onChange={set('best_time')}
                    >
                      <option value="">Qualquer horário</option>
                      <option>Manhã (8h–12h)</option>
                      <option>Tarde (12h–17h)</option>
                      <option>Final da tarde (17h–19h)</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #712ae2 100%)' }}
              >
                {loading ? 'Enviando...' : 'Enviar mensagem →'}
              </button>
              <p className="text-center text-xs text-[#9ca3af] dark:text-[#908fa0]">
                Respondemos em até 4 horas em dias úteis.
              </p>
            </form>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-14">
        <AdSlot slot={ADSENSE_SLOT_PUBLIC} className="h-24" />
      </div>
      <PublicFooter />
    </div>
  )
}
