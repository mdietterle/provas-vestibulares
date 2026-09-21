import { Link } from 'react-router-dom'
import AdSlot from '../components/AdSlot'
import Seo from '../components/Seo'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'
import Breadcrumb from '../components/Breadcrumb'

const ADSENSE_SLOT_PUBLIC = (import.meta.env.VITE_ADSENSE_SLOT_PUBLIC as string | undefined) || ''

function ManualCard({
  audience,
  description,
  href,
}: {
  audience: string
  description: string
  href: string
}) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] p-6 bg-white flex flex-col gap-3">
      <h3 className="font-display text-lg font-bold text-[#1E293B]">{audience}</h3>
      <p className="text-sm text-[#64748B] leading-relaxed flex-1">{description}</p>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#712ae2] dark:text-[#818CF8] hover:underline"
      >
        Ler o manual completo →
      </a>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#1E293B] mb-1">{q}</p>
      <p className="text-sm text-[#64748B] leading-relaxed">{a}</p>
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0F172A] font-sans">
      <Seo
        title="Central de Ajuda — Cognition AI"
        description="Tire dúvidas sobre como usar o Cognition AI: correção de provas com IA, simulados de vestibular, cadastro de turmas e planos."
        path="/ajuda"
      />
      <PublicHeader />

      <div className="max-w-4xl mx-auto px-6 py-14">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Ajuda' }]} />
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="font-display text-3xl font-bold text-[#1E293B] mb-3">Central de Ajuda</h1>
          <p className="text-[#64748B] leading-relaxed">
            A Cognition AI é uma plataforma de avaliações que ajuda instituições de ensino a aplicar provas,
            corrigir redações com apoio de Inteligência Artificial e preparar alunos para vestibulares como
            ENEM, UFPR e ACAFE através de simulados com questões reais. Reunimos aqui os manuais completos
            para cada perfil de usuário e as dúvidas mais frequentes.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-16">
          <ManualCard
            audience="Manual do Aluno"
            description="Como acessar a plataforma, realizar provas e simulados, consultar resultados corrigidos pela IA e acompanhar sua evolução ao longo do período."
            href="/docs/manual-aluno.html"
          />
          <ManualCard
            audience="Manual do Professor"
            description="Criação de questões e provas, correção assistida por IA, upload de provas digitalizadas, simulados de vestibular e análise de desempenho das turmas."
            href="/docs/manual-professor.html"
          />
          <ManualCard
            audience="Manual do Administrador"
            description="Configuração da instituição, gestão de professores e alunos, controle de acesso por perfil e monitoramento geral do uso da plataforma."
            href="/docs/manual-administrador.html"
          />
        </div>

        <div>
          <h2 className="font-display text-xl font-bold text-[#1E293B] mb-6 text-center">Perguntas frequentes</h2>
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
            <FaqItem
              q="Como um aluno cria uma conta?"
              a="Basta acessar a página de cadastro de aluno, informar a instituição de ensino e confirmar o e-mail recebido. Depois disso o login já funciona normalmente."
            />
            <FaqItem
              q="Os simulados de vestibular contam como nota da escola?"
              a="Não. Simulados são exercícios de prática com questões reais de ENEM, UFPR e ACAFE, usados para treino — eles não substituem as provas aplicadas pela escola nem geram nota oficial."
            />
            <FaqItem
              q="Quem corrige as redações e provas dissertativas?"
              a="A correção pode ser feita pelo professor ou de forma assistida por Inteligência Artificial, que também gera um comentário em português explicando a nota atribuída."
            />
            <FaqItem
              q="Por que minha nota ainda não apareceu?"
              a="As notas de provas da escola são liberadas manualmente pelo professor responsável. Já os simulados mostram o resultado imediatamente após o envio."
            />
            <FaqItem
              q="Esqueci minha senha, o que eu faço?"
              a="Entre em contato com o administrador da sua instituição para redefinir o acesso."
            />
            <FaqItem
              q="Posso refazer um simulado quantas vezes eu quiser?"
              a="Sim. Cada novo simulado seleciona um novo conjunto de questões, então você pode praticar quantas vezes quiser."
            />
          </div>
        </div>

        <p className="text-center text-sm text-[#64748B] mt-16">
          Não encontrou o que precisava?{' '}
          <Link to="/contact" className="text-[#712ae2] dark:text-[#818CF8] font-semibold hover:underline">Fale com a gente</Link>.
        </p>

        <div className="mt-12">
          <AdSlot slot={ADSENSE_SLOT_PUBLIC} className="h-24" />
        </div>
      </div>
      <PublicFooter />
    </div>
  )
}
