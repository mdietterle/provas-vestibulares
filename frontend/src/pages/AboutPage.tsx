import { Link } from 'react-router-dom'
import AdSlot from '../components/AdSlot'
import Seo from '../components/Seo'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'
import Breadcrumb from '../components/Breadcrumb'

const ADSENSE_SLOT_PUBLIC = (import.meta.env.VITE_ADSENSE_SLOT_PUBLIC as string | undefined) || ''

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#10131a] text-slate-800">
      <Seo
        title="Sobre o Cognition AI — plataforma de correção de provas com IA"
        description="Conheça o Cognition AI: como a plataforma corrige provas e redações com apoio de Inteligência Artificial e monta simulados de vestibular a partir de provas oficiais."
        path="/sobre"
      />
      <PublicHeader />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Sobre nós' }]} />

        <h1 className="text-3xl font-bold mt-2 mb-2">Sobre o Cognition AI</h1>
        <p className="text-sm text-[#64748B] mb-10">Uma plataforma de avaliação educacional com apoio de Inteligência Artificial</p>

        <div className="space-y-8 text-sm leading-relaxed text-[#333] dark:text-[#e1e2ec]">
          <section>
            <h2 className="text-lg font-bold mb-2 text-slate-800">O que fazemos</h2>
            <p>
              O Cognition AI nasceu de um problema concreto do dia a dia escolar: professores gastam horas
              corrigindo provas e redações manualmente, tempo que poderia ser usado para dar atenção
              individualizada aos alunos. A plataforma automatiza a correção de provas objetivas e
              dissertativas, a geração de bancos de questões e a aplicação de simulados de vestibular, usando
              Inteligência Artificial como apoio - não substituto - do trabalho pedagógico do professor.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-slate-800">Para quem é</h2>
            <p>
              Construímos o Cognition AI para três públicos que trabalham juntos no dia a dia escolar:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Instituições de ensino</strong>, que precisam de um painel centralizado para gerenciar turmas, provas e desempenho;</li>
              <li><strong>Professores</strong>, que ganham tempo com correção automática e geração de questões alinhadas à BNCC;</li>
              <li><strong>Alunos</strong>, que podem treinar com simulados de vestibulares reais - veja a lista completa de{' '}
                <Link to="/universidades" className="text-amber-500 dark:text-teal-400 hover:underline">universidades e exames</Link>{' '}
                que fazem parte do sistema - e receber explicações de IA sobre onde erraram.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-slate-800">Como tratamos os dados dos vestibulares</h2>
            <p>
              Os simulados são montados a partir de provas e gabaritos publicados oficialmente pelas próprias
              bancas organizadoras (INEP/MEC, ACAFE, UFPR, UFRGS, UFSC, PUCPR, entre outras), com fins
              exclusivamente educacionais. Detalhes sobre coleta e uso de dados pessoais estão na nossa{' '}
              <Link to="/privacidade" className="text-amber-500 dark:text-teal-400 hover:underline">Política de Privacidade</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-slate-800">Quem mantém o projeto</h2>
            <p>
              O Cognition AI é desenvolvido e mantido de forma independente. Ainda estamos em fase de
              crescimento e evoluindo a plataforma com frequência — se você notar algo que pode melhorar, ou
              tiver sugestões, adoraríamos ouvir através da nossa{' '}
              <Link to="/contact" className="text-amber-500 dark:text-teal-400 hover:underline">página de contato</Link>.
            </p>
          </section>
        </div>

        <div className="mt-12">
          <AdSlot slot={ADSENSE_SLOT_PUBLIC} className="h-24" />
        </div>
      </div>
      <PublicFooter />
    </div>
  )
}
