import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function EnemPage() {
  const customContent = (
    <div className="space-y-10 mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      {/* Banner Principal */}
      <div className="bg-gradient-to-br from-[#2563EB] via-[#1a3a8a] to-[#6366F1] text-white p-6 sm:p-10 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-yellow-300 bg-white/10 px-3 py-1 rounded-full mb-3">
            Tudo o que você precisa saber
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-white leading-tight">
            Guia Prático do ENEM: Inscrição, Provas e Dicas de Estudo
          </h2>
          <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-2xl font-normal">
            O ENEM é hoje a principal porta de entrada pras universidades no Brasil. Seja pra conseguir uma vaga numa federal pelo SiSU, uma bolsa pelo ProUni ou até estudar fora, entender como o exame funciona é o primeiro passo pra se dar bem na prova. E a gente tá aqui pra descomplicar tudo isso pra você.
          </p>
        </div>
      </div>

      {/* Seção Calendário: datas oficiais 2026 */}
      <section className="bg-white dark:bg-[#151f38] border border-[#E2E8F0] dark:border-[#1e2d4a] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            Calendário oficial do ENEM 2026
          </h2>
          <p className="text-sm text-[#475569] dark:text-[#94a3b8] mt-2 leading-relaxed">
            Datas confirmadas pelo INEP no Edital nº 64, publicado em 21 de maio de 2026. Fique de olho: o edital de cada
            edição costuma ter pequenas variações, então sempre confira o calendário oficial em{' '}
            <a href="https://enem.inep.gov.br/participante/" target="_blank" rel="noreferrer" className="underline font-semibold">
              enem.inep.gov.br/participante
            </a>.
          </p>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Inscrições</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">25 de maio a 12 de junho de 2026</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Pagamento da taxa (R$ 85)</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Até 17 de junho de 2026</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">1º dia de prova</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">8 de novembro — Linguagens, Ciências Humanas e Redação</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">2º dia de prova</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">15 de novembro — Ciências da Natureza e Matemática</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Gabarito oficial</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Até 30 de novembro de 2026</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Resultado individual (TRI)</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Normalmente em janeiro do ano seguinte, seguido das chamadas do SiSU</dd>
          </div>
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#6b7385]">
          A isenção da taxa (automática para concluintes de escola pública, ou mediante solicitação para baixa renda) tem
          prazo próprio, geralmente em abril — antes da inscrição regular abrir.
        </p>
      </section>

      {/* Seção 1: Onde usar a nota */}
      <section className="bg-white dark:bg-[#151f38] border border-[#E2E8F0] dark:border-[#1e2d4a] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            O que dá pra fazer com a nota do ENEM?
          </h2>
          <div className="text-sm text-[#475569] dark:text-[#94a3b8] mt-4 space-y-4 leading-relaxed">
            <p>
              Diferente dos vestibulares tradicionais em que você faz uma prova específica pra cada faculdade, o ENEM funciona como um passaporte universal. Você faz a prova uma vez e, com aquela nota na mão, um leque gigantesco de opções se abre. O caminho mais conhecido é o <strong>SiSU</strong>, que é o sistema do governo pra distribuir as vagas nas universidades públicas (federais e estaduais) pelo país afora. Você entra no site, vê as notas de corte e aplica pra vaga que mais faz sentido pra você, seja na ampla concorrência ou pelas cotas.
            </p>
            <p>
              Mas não para por aí. Se o seu foco é uma universidade particular, a nota do ENEM é a chave pra conseguir bolsas de estudo integrais ou parciais através do <strong>ProUni</strong>. E mesmo que você não consiga a bolsa, a nota serve pra tentar um financiamento pelo <strong>FIES</strong>, com juros muito mais baixos que os do mercado. Tem até a galera que quer estudar fora: hoje em dia, mais de 50 universidades lá em Portugal aceitam o ENEM como forma de ingresso pra brasileiros. É muita oportunidade rolando ao mesmo tempo.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm leading-relaxed">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
              Algumas das gigantes que usam a nota:
            </h3>
            <p className="text-[#475569] dark:text-[#cbd5e1] mb-3">
              A lista é enorme, mas só pra te dar um gostinho das referências em ensino e pesquisa que tão te esperando:
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {['UFRJ', 'UFMG', 'UFRGS', 'UNIFESP', 'UnB', 'UFPE', 'UFSC', 'UFPR', 'UFF', 'UFBA', 'UFG', 'UFCE', 'UFPA', 'UFAM', 'USP (via Enem-USP)', 'Unicamp (via Enem-Unicamp)'].map(u => (
                <span key={u} className="bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#334155] px-2.5 py-1 rounded-md font-semibold text-[#2563EB] dark:text-[#818CF8]">
                  {u}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <CampusImage
            variant="reveal-wide"
            src="https://upload.wikimedia.org/wikipedia/commons/1/13/UFRJ_-_Campus_da_Praia_Vermelha.jpg"
            alt="Campus Praia Vermelha da UFRJ, uma das universidades que aceitam a nota do ENEM via SiSU"
            caption="Campus Praia Vermelha, UFRJ"
            credit="Foto: Halley Pacheco de Oliveira / Wikimedia Commons, CC BY-SA 3.0"
          />
          <CampusImage
            variant="reveal-wide"
            src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Cidade_universit%C3%A1ria_da_Universidade_de_S%C3%A3o_Paulo_%28USP%29.jpg"
            alt="Cidade Universitária da USP, que também aceita nota do ENEM na modalidade Enem-USP"
            caption="Cidade Universitária, USP"
            credit="Foto: Hector.carvalho / Wikimedia Commons, CC BY-SA 3.0"
          />
        </div>
      </section>

      {/* Seção 2: Como funciona a inscrição */}
      <section className="bg-white dark:bg-[#151f38] border border-[#E2E8F0] dark:border-[#1e2d4a] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            Como funciona o processo de inscrição?
          </h2>
          <div className="text-sm text-[#475569] dark:text-[#94a3b8] mt-4 space-y-4 leading-relaxed">
            <p>
              A inscrição do ENEM parece complicada de primeira, mas na real ela segue um ritmo bem previsível todo ano. A primeira coisa que você precisa ficar de olho, lá por volta de abril, é o prazo pra pedir a <strong>isenção da taxa</strong>. Se você tá no terceiro ano do ensino médio em escola pública, a isenção é automática. Se você já se formou numa escola pública, ou se estudou em colégio particular com bolsa integral e a renda da sua família não é tão alta, você também pode pedir pra não pagar a taxa. Só toma cuidado: se você teve a isenção no ano passado e faltou na prova, vai precisar justificar essa ausência no site antes de pedir a isenção de novo.
            </p>
            <p>
              Depois que passa a fase da isenção, lá pra maio ou junho, abre a <strong>inscrição oficial</strong> de verdade pra todo mundo, pelo site do INEP. Hoje em dia, tudo tá integrado, então você vai precisar da sua conta no portal <strong>gov.br</strong> pra acessar. É nesse momento que você escolhe detalhes importantes da sua prova, como a língua estrangeira (Inglês ou Espanhol) e a cidade onde você quer fazer o exame. Também é a hora de avisar se você precisa de algum atendimento especial, tipo uma prova com letra maior, mais tempo pra fazer, ou uma sala pra amamentação. 
            </p>
            <p>
              E um detalhe muito importante: pra quem não conseguiu a isenção, a inscrição não acaba quando você preenche os dados no site. Você precisa gerar a guia e fazer o pagamento da taxa (que costuma ficar perto dos 85 reais). Dá pra pagar por PIX, boleto ou cartão, mas a sua inscrição só fica confirmada mesmo depois que o pagamento é compensado pelo banco. Então, nada de deixar pro último minuto!
            </p>
          </div>
        </div>
      </section>

      {/* Seção 3: Estrutura da Prova e a TRI */}
      <section className="bg-white dark:bg-[#151f38] border border-[#E2E8F0] dark:border-[#1e2d4a] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            O que esperar dos dias de prova (e como sua nota é calculada)
          </h2>
          <div className="text-sm text-[#475569] dark:text-[#94a3b8] mt-4 space-y-4 leading-relaxed">
            <p>
              O ENEM é uma verdadeira maratona dividida em dois domingos consecutivos lá em novembro. No <strong>primeiro domingo</strong>, você vai encarar as provas de Linguagens, Ciências Humanas e a famosa Redação. São 5 horas e meia pra fazer tudo. Na parte de Linguagens (45 questões), espere muito texto, interpretação, artes e aquela língua estrangeira que você escolheu na inscrição. Nas Humanas (mais 45 questões), o foco é em História, Geografia, Sociologia e Filosofia. Mas o grande peso desse dia costuma ser a Redação, onde você precisa escrever um texto dissertativo-argumentativo sobre um problema social e, no fim, propor uma solução bem detalhada pra ele.
            </p>
            <p>
              Já no <strong>segundo domingo</strong>, a pegada muda totalmente. Você vai ter 5 horas pra resolver a parte de Exatas e Natureza. São 45 questões de Matemática, onde a interpretação de gráficos, tabelas e porcentagens é fundamental. E mais 45 questões de Ciências da Natureza, que misturam Física, Química e Biologia, quase sempre trazendo os conceitos teóricos pra situações muito práticas do nosso dia a dia ou problemas ambientais.
            </p>
          </div>
        </div>

        <div className="bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e] rounded-2xl p-5 space-y-3 mt-4">
          <h3 className="font-bold text-base text-[#2563EB] dark:text-[#818CF8]">
            A mágica da TRI: por que notas iguais não existem?
          </h3>
          <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
            No ENEM, você não ganha simplesmente um ponto por cada questão que acerta. O sistema usa algo chamado TRI (Teoria de Resposta ao Item). Basicamente, o algoritmo avalia o quão coerente foi o seu desempenho. Funciona assim: as questões já são classificadas previamente como fáceis, médias ou difíceis. Se você acerta várias questões difíceis, mas erra um monte de questões fáceis do mesmo assunto, o sistema desconfia que você chutou. O resultado? Os pontos daquelas questões difíceis que você acertou acabam valendo bem menos. A regra de ouro é sempre garantir as questões fáceis e médias primeiro, porque elas são o alicerce da sua nota.
          </p>
        </div>
      </section>

      {/* Seção 4: Dicas práticas de estudo */}
      <section className="bg-white dark:bg-[#151f38] border border-[#E2E8F0] dark:border-[#1e2d4a] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            Dicas práticas pra mandar bem
          </h2>
          <div className="text-sm text-[#475569] dark:text-[#94a3b8] mt-4 space-y-4 leading-relaxed">
            <p>
              Estudar pro ENEM não é só devorar livros, é saber fazer a prova. Uma das melhores coisas que você pode fazer ao longo do ano é treinar com <strong>simulados cronometrados</strong>. A prova é muito extensa, então não basta saber o conteúdo; você precisa criar resistência física e mental pra ler textos enormes por 5 horas seguidas, mantendo uma média ali de 3 minutos por questão.
            </p>
            <p>
              No dia da prova de <strong>redação</strong>, uma estratégia que muita gente usa é não deixar o texto pro último minuto. Como a redação vale 1.000 pontos e tem um peso gigante, tente começar o primeiro domingo lendo a proposta do tema. Rabisque as suas ideias, monte um rascunho e passe a limpo com calma enquanto sua cabeça ainda tá fresca. Se você deixar pra fazer isso depois de ler 90 questões difíceis, o cansaço pode te prejudicar muito.
            </p>
            <p>
              E quando estiver resolvendo as questões, lembre da TRI: se você bater o olho numa questão e perceber que vai demorar muito pra resolver, seja porque a conta é enorme ou o raciocínio tá travado, <strong>pule sem dó</strong>. Marca um pontinho do lado e continua a prova. O seu objetivo principal é varrer o caderno inteiro garantindo todas as questões fáceis e médias, que são as que vão jogar a sua nota lá em cima. Só depois de garantir essas vitórias rápidas é que você volta pras questões que deixou pra trás.
            </p>
          </div>
        </div>
      </section>
    </div>
  )

  return <UniversityBasePage slug="enem" customContent={customContent} />
}
