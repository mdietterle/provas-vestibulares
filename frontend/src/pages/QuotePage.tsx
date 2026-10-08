import { useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'
import Breadcrumb from '../components/Breadcrumb'

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-[#334155] dark:text-slate-300 uppercase tracking-wide mb-1.5">{children}</label>
}

function Input({ id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  return (
    <input
      id={id}
      className="w-full border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e1e2ec] placeholder-[#9ca3af] dark:placeholder-[#908fa0] focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all"
      {...props}
    />
  )
}

function Select({ id, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { id: string }) {
  return (
    <select
      id={id}
      className="w-full border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e1e2ec] focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all"
      {...props}
    >
      {children}
    </select>
  )
}

export default function QuotePage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    institution: '',
    role: '',
    professors: '',
    students: '',
    exams_month: '',
    questions_month: '',
    corrections_month: '',
    use_ai: '',
    plan_interest: '',
    current_tool: '',
    message: '',
    how: '',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
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
        title="Solicitar orçamento — Cognition AI"
        description="Peça um orçamento personalizado do Cognition AI para sua escola: correção de provas e redações com IA e simulados de vestibular."
        path="/quote"
      />
      <PublicHeader />

      <div className="max-w-5xl mx-auto px-6 pt-8">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Orçamento' }]} />
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-14 grid lg:grid-cols-5 gap-12">
        {/* Left — info */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 bg-[#e9ddff] dark:bg-slate-800 text-[#f59e0b] dark:text-teal-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Solicitar Orçamento
            </span>
            <h1 className="font-display text-2xl font-bold text-[#1E293B] leading-tight mb-3">
              Receba uma proposta personalizada para sua instituição
            </h1>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Preencha o formulário e nossa equipe entra em contato em até 1 dia útil com um orçamento detalhado, incluindo simulação de custos e ROI esperado.
            </p>
          </div>

          {/* Highlights */}
          <div className="space-y-3">
            {[
              { icon: '⚡', title: 'Resposta em até 1 dia útil', sub: 'Nossa equipe retorna rapidamente com a proposta' },
              { icon: '📊', title: 'Simulação de ROI incluída', sub: 'Calculamos o tempo economizado por professor/mês' },
              { icon: '🔒', title: 'Sem compromisso', sub: 'Orçamento gratuito, sem fidelidade obrigatória' },
              { icon: '🎓', title: 'Demonstração gratuita', sub: 'Podemos agendar um trial completo para sua equipe' },
            ].map(h => (
              <div key={h.title} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
                <span className="text-xl shrink-0">{h.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-[#1E293B]">{h.title}</p>
                  <p className="text-xs text-[#64748B]">{h.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Plans quick ref */}
          <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F4F6F9] dark:bg-slate-800">
              <p className="text-xs font-semibold text-[#334155] dark:text-slate-300 uppercase tracking-wide">Referência de preços</p>
            </div>
            {[
              { plan: 'Professor Solo', price: 'R$ 59/mês' },
              { plan: 'Essencial', price: 'R$ 199 + R$ 9,90/prof' },
              { plan: 'Inteligente', price: 'R$ 399 + R$ 24,90/prof' },
              { plan: 'Institucional', price: 'R$ 799/unid + R$ 19,90/prof' },
            ].map(p => (
              <div key={p.plan} className="flex items-center justify-between px-4 py-2.5 border-b border-[#f0f0f8] dark:border-[#464554] last:border-b-0 bg-white dark:bg-[#1d1f27]">
                <span className="text-xs text-[#334155] dark:text-slate-300">{p.plan}</span>
                <span className="text-xs font-semibold text-[#0d9488]">{p.price}</span>
              </div>
            ))}
            <div className="px-4 py-2.5 bg-[#F4F6F9] dark:bg-slate-800">
              <Link to="/plans" className="text-xs font-semibold text-[#f59e0b] hover:underline">Ver todos os planos →</Link>
            </div>
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
              <h2 className="font-display text-xl font-bold text-[#1E293B] mb-2">Solicitação recebida!</h2>
              <p className="text-sm text-[#64748B] leading-relaxed mb-6">
                Obrigado! Nossa equipe analisará suas necessidades e entrará em contato em até 1 dia útil com uma proposta personalizada.
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}>
                Voltar à página inicial
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1d1f27] rounded-2xl border border-[#E2E8F0] p-8 space-y-6" style={{ boxShadow: '0 4px 24px rgba(0,35,111,0.08)' }}>
              <h2 className="font-display text-lg font-bold text-[#1E293B]">Dados do solicitante</h2>

              {/* Contact info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nome completo *</Label>
                  <Input id="name" required placeholder="Seu nome" value={form.name} onChange={set('name')} />
                </div>
                <div>
                  <Label>E-mail institucional *</Label>
                  <Input id="email" type="email" required placeholder="voce@escola.edu.br" value={form.email} onChange={set('email')} />
                </div>
                <div>
                  <Label>Telefone / WhatsApp</Label>
                  <Input id="phone" type="tel" placeholder="(11) 9 0000-0000" value={form.phone} onChange={set('phone')} />
                </div>
                <div>
                  <Label>Cargo / Função *</Label>
                  <Select id="role" required value={form.role} onChange={set('role')}>
                    <option value="">Selecione...</option>
                    <option>Diretor(a)</option>
                    <option>Coordenador(a) Pedagógico</option>
                    <option>TI / Tecnologia</option>
                    <option>Professor(a)</option>
                    <option>Proprietário(a)</option>
                    <option>Outro</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Nome da instituição *</Label>
                <Input id="institution" required placeholder="Escola / Rede / Universidade" value={form.institution} onChange={set('institution')} />
              </div>

              <div className="border-t border-[#E2E8F0] pt-6">
                <h2 className="font-display text-lg font-bold text-[#1E293B] mb-4">Dimensionamento</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Professores *</Label>
                    <Select id="professors" required value={form.professors} onChange={set('professors')}>
                      <option value="">Qtde...</option>
                      <option>1 (solo)</option>
                      <option>2–10</option>
                      <option>11–30</option>
                      <option>31–60</option>
                      <option>61–100</option>
                      <option>Mais de 100</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Alunos ativos</Label>
                    <Select id="students" value={form.students} onChange={set('students')}>
                      <option value="">Qtde...</option>
                      <option>Até 100</option>
                      <option>100–500</option>
                      <option>500–1.000</option>
                      <option>1.000–5.000</option>
                      <option>Mais de 5.000</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Provas/mês estimadas</Label>
                    <Select id="exams_month" value={form.exams_month} onChange={set('exams_month')}>
                      <option value="">Qtde...</option>
                      <option>Menos de 10</option>
                      <option>10–30</option>
                      <option>30–100</option>
                      <option>Mais de 100</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Questões geradas/mês</Label>
                    <Select id="questions_month" value={form.questions_month} onChange={set('questions_month')}>
                      <option value="">Estimativa...</option>
                      <option>Até 50</option>
                      <option>50–200</option>
                      <option>200–500</option>
                      <option>Mais de 500</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Correções IA/mês</Label>
                    <Select id="corrections_month" value={form.corrections_month} onChange={set('corrections_month')}>
                      <option value="">Estimativa...</option>
                      <option>Até 100</option>
                      <option>100–500</option>
                      <option>500–2.000</option>
                      <option>Mais de 2.000</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Uso de IA *</Label>
                    <Select id="use_ai" required value={form.use_ai} onChange={set('use_ai')}>
                      <option value="">Prioridade...</option>
                      <option>Geração de questões</option>
                      <option>Correção de discursivas</option>
                      <option>Ambos igualmente</option>
                      <option>Não preciso de IA</option>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#E2E8F0] pt-6">
                <h2 className="font-display text-lg font-bold text-[#1E293B] mb-4">Preferências</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Plano de interesse</Label>
                    <Select id="plan_interest" value={form.plan_interest} onChange={set('plan_interest')}>
                      <option value="">Não sei ainda</option>
                      <option>Professor Solo — R$ 59/mês</option>
                      <option>Essencial — a partir de R$ 199</option>
                      <option>Inteligente — a partir de R$ 399</option>
                      <option>Institucional — a partir de R$ 799/unid</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Ferramenta atual</Label>
                    <Select id="current_tool" value={form.current_tool} onChange={set('current_tool')}>
                      <option value="">Selecione...</option>
                      <option>Google Forms</option>
                      <option>Moodle</option>
                      <option>Papel / impresso</option>
                      <option>Outra plataforma</option>
                      <option>Nenhuma</option>
                    </Select>
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Como conheceu o Cognition AI?</Label>
                  <Select id="how" value={form.how} onChange={set('how')}>
                    <option value="">Selecione...</option>
                    <option>Indicação de colega</option>
                    <option>Redes sociais</option>
                    <option>Google / busca</option>
                    <option>Evento ou congresso</option>
                    <option>Outro</option>
                  </Select>
                </div>
                <div className="mt-4">
                  <Label>Observações adicionais</Label>
                  <textarea
                    className="w-full border border-[#c5c5d3] dark:border-[#464554] rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#10131a] text-[#1E293B] dark:text-[#e1e2ec] placeholder-[#9ca3af] dark:placeholder-[#908fa0] focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all resize-none"
                    rows={3}
                    placeholder="Descreva necessidades específicas, integrações desejadas, prazos, etc."
                    value={form.message}
                    onChange={set('message')}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
              >
                {loading ? 'Enviando...' : 'Solicitar orçamento gratuito →'}
              </button>
              <p className="text-center text-xs text-[#9ca3af] dark:text-[#908fa0]">
                Sem compromisso. Resposta em até 1 dia útil.
              </p>
            </form>
          )}
        </div>
      </div>
      <PublicFooter />
    </div>
  )
}
