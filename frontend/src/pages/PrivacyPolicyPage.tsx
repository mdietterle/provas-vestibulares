import AdSlot from '../components/AdSlot'
import Seo from '../components/Seo'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'
import Breadcrumb from '../components/Breadcrumb'

const ADSENSE_SLOT_PUBLIC = (import.meta.env.VITE_ADSENSE_SLOT_PUBLIC as string | undefined) || ''

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#10131a] text-[#1E293B]">
      <Seo
        title="Política de Privacidade — Cognition AI"
        description="Como o Cognition AI coleta, usa e protege dados pessoais de professores, alunos e instituições de ensino na plataforma."
        path="/privacidade"
      />
      <PublicHeader />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Privacidade' }]} />

        <h1 className="text-3xl font-bold mt-2 mb-2">Política de Privacidade</h1>
        <p className="text-sm text-[#64748B] mb-10">Última atualização: julho de 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-[#333] dark:text-[#e1e2ec]">
          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">1. Quem somos</h2>
            <p>
              Esta plataforma (aplicativo mobile e site) é operada para oferecer serviços de avaliação
              educacional, correção automática de provas e redações com apoio de Inteligência Artificial,
              e simulados de vestibular/ENEM para instituições de ensino, professores e alunos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">2. Dados que coletamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dados de cadastro:</strong> nome, e-mail e senha (armazenada de forma criptografada).</li>
              <li><strong>Dados acadêmicos:</strong> respostas de provas e simulados, redações submetidas, notas e feedback de correção.</li>
              <li><strong>Dados de uso:</strong> informações técnicas básicas de acesso (dispositivo, sistema operacional) para garantir o funcionamento e a segurança do serviço.</li>
              <li><strong>Dados de publicidade:</strong> no aplicativo mobile, identificadores de publicidade podem ser coletados pelo Google AdMob para exibição de anúncios (ver seção 4).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">3. Como usamos seus dados</h2>
            <p>Utilizamos os dados coletados para:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Criar e manter sua conta e autenticar seu acesso;</li>
              <li>Aplicar e corrigir provas, simulados e redações (incluindo correção assistida por IA);</li>
              <li>Enviar e-mails operacionais (confirmação de cadastro, convites, recuperação de acesso);</li>
              <li>Exibir anúncios no aplicativo mobile, quando aplicável;</li>
              <li>Cumprir obrigações legais e prevenir fraudes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">4. Compartilhamento com terceiros</h2>
            <p>Para operar o serviço, utilizamos os seguintes fornecedores, que podem processar dados em nosso nome:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Resend</strong> — envio de e-mails transacionais (confirmação de cadastro, convites).</li>
              <li><strong>Groq</strong> — processamento de IA para geração e correção de questões/redações.</li>
              <li><strong>Google AdMob</strong> — exibição de anúncios no aplicativo mobile. O AdMob pode coletar identificadores de publicidade conforme a{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-amber-500 dark:text-teal-400 hover:underline">
                  política de privacidade do Google
                </a>.
              </li>
            </ul>
            <p className="mt-2">Não vendemos seus dados pessoais a terceiros.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">5. Seus direitos (LGPD)</h2>
            <p>
              Nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode solicitar a qualquer
              momento: acesso aos seus dados, correção de informações incorretas, exclusão de conta e dados,
              portabilidade dos dados e informações sobre com quem compartilhamos seus dados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">6. Retenção e segurança</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para cumprir
              obrigações legais. Adotamos medidas técnicas e organizacionais razoáveis (como criptografia de
              senha) para proteger seus dados contra acesso não autorizado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2 text-[#1E293B]">7. Contato</h2>
            <p>
              Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato pelo e-mail{' '}
              <a href="mailto:contato@aiassessmenthub.com.br" className="text-amber-500 dark:text-teal-400 hover:underline">
                contato@aiassessmenthub.com.br
              </a>.
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
