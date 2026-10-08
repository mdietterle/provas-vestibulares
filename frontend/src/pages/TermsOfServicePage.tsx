import { Link } from 'react-router-dom'
import AdSlot from '../components/AdSlot'
import Seo from '../components/Seo'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'
import Breadcrumb from '../components/Breadcrumb'

const ADSENSE_SLOT_PUBLIC = (import.meta.env.VITE_ADSENSE_SLOT_PUBLIC as string | undefined) || ''

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#10131a] text-[#1E293B]">
      <Seo
        title="Termos de Uso — Cognition AI"
        description="Condições de uso da plataforma Cognition AI para escolas, professores e alunos: cadastro, assinatura, responsabilidades e limites de uso."
        path="/termos"
      />
      <PublicHeader />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Termos de Uso' }]} />

        <h1 className="text-3xl font-bold mt-2 mb-2">Termos de Uso</h1>
        <p className="text-sm text-[#64748B] mb-10">Última atualização: agosto de 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-[#333] dark:text-[#e1e2ec]">
          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">1. Sobre estes termos</h2>
            <p>
              Estes Termos de Uso regulam o acesso e uso da plataforma Cognition AI (site e aplicativo mobile),
              que oferece serviços de avaliação educacional, correção automática de provas e redações com apoio
              de Inteligência Artificial, geração de questões e simulados de vestibular/ENEM. O serviço é
              mantido e operado de forma independente por seu responsável, atualmente sem constituição de
              pessoa jurídica própria. Ao criar uma conta ou usar a plataforma, você concorda com estes termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">2. Quem pode usar</h2>
            <p>
              A plataforma é destinada a instituições de ensino, professores e alunos. Contas de aluno
              vinculam-se a uma instituição já cadastrada ou cadastrada no momento do registro. Você é
              responsável por fornecer informações verdadeiras no cadastro e por manter a confidencialidade da
              sua senha.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">3. Uso aceitável</h2>
            <p>Ao usar a plataforma, você concorda em não:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Compartilhar sua conta com terceiros ou acessar contas de outras pessoas sem autorização;</li>
              <li>Tentar burlar, sobrecarregar ou comprometer a segurança do serviço;</li>
              <li>Enviar, em redações ou respostas, conteúdo ofensivo, ilegal ou que viole direitos de terceiros;</li>
              <li>Copiar, revender ou redistribuir o banco de questões ou o software da plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">4. Correção por Inteligência Artificial</h2>
            <p>
              A correção automática de provas, redações e simulados é feita com apoio de modelos de
              Inteligência Artificial e serve como ferramenta de apoio pedagógico. Embora buscamos manter alta
              qualidade e consistência, a correção por IA pode conter imprecisões. Professores e instituições
              podem revisar e ajustar notas e feedbacks gerados automaticamente antes de considerá-los
              definitivos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">5. Planos e pagamento</h2>
            <p>
              Os planos disponíveis e seus respectivos preços estão descritos na{' '}
              <Link to="/plans" className="text-[#f59e0b] dark:text-teal-400 hover:underline">página de planos</Link>. Instituições
              contratantes são responsáveis pelos pagamentos referentes ao plano escolhido, nos termos acordados
              no momento da contratação.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">6. Propriedade intelectual</h2>
            <p>
              O software, marca e identidade visual da Cognition AI pertencem ao seu responsável. Provas e
              questões de vestibulares públicos (como ENEM, ACAFE, UFPR, UFRGS, UFSC e PUCPR) são importadas de
              fontes oficiais para fins educacionais; os direitos sobre o conteúdo original dessas provas
              permanecem com as respectivas instituições organizadoras.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">7. Cancelamento e encerramento de conta</h2>
            <p>
              Você pode solicitar o encerramento da sua conta e a exclusão dos seus dados a qualquer momento,
              conforme descrito na{' '}
              <Link to="/privacidade" className="text-[#f59e0b] dark:text-teal-400 hover:underline">Política de Privacidade</Link>.
              Reservamo-nos o direito de suspender contas que violem estes termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">8. Limitação de responsabilidade</h2>
            <p>
              A plataforma é fornecida "como está". Não garantimos disponibilidade ininterrupta do serviço e não
              nos responsabilizamos por decisões pedagógicas ou acadêmicas tomadas exclusivamente com base em
              correções ou análises geradas pela IA.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">9. Alterações nestes termos</h2>
            <p>
              Podemos atualizar estes Termos de Uso periodicamente para refletir mudanças no serviço ou na
              legislação aplicável. A data da última atualização é sempre indicada no topo desta página.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">10. Contato</h2>
            <p>
              Dúvidas sobre estes termos podem ser enviadas para{' '}
              <a href="mailto:contato@aiassessmenthub.com.br" className="text-[#f59e0b] dark:text-teal-400 hover:underline">
                contato@aiassessmenthub.com.br
              </a>{' '}
              ou pela{' '}
              <Link to="/contact" className="text-[#f59e0b] dark:text-teal-400 hover:underline">página de contato</Link>.
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
