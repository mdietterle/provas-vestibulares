import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function AcafePage() {
  const customContent = (
    <div className="space-y-10 mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      {/* Banner Principal */}
      <div className="bg-gradient-to-br from-[#4f46e5] via-[#1a3a8a] to-[#712ae2] text-white p-6 sm:p-10 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-yellow-300 bg-white/10 px-3 py-1 rounded-full mb-3">
            Tudo o que você precisa saber
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-white leading-tight">
            Guia do Vestibular ACAFE: o que é, quem participa e como se inscrever
          </h2>
          <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-2xl font-normal">
            Se você mora em Santa Catarina, provavelmente já ouviu falar do vestibular ACAFE. Ele é a principal porta de
            entrada pras faculdades particulares do estado — mas, diferente do ENEM, não é um exame nacional único. Entenda
            como o sistema funciona antes de se inscrever.
          </p>
        </div>
      </div>

      {/* Seção 1: O que é o sistema ACAFE */}
      <section className="bg-white dark:bg-[#151f38] border border-[#E2E8F0] dark:border-[#1e2d4a] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            O que é o sistema ACAFE?
          </h2>
          <div className="text-sm text-[#475569] dark:text-[#94a3b8] mt-4 space-y-4 leading-relaxed">
            <p>
              A ACAFE (Associação Catarinense das Fundações Educacionais) não é uma universidade — é uma entidade que
              organiza um <strong>vestibular unificado</strong> usado por um conjunto de universidades e centros
              universitários privados de Santa Catarina. Em vez de cada instituição aplicar sua própria prova em datas
              diferentes, o candidato faz um único exame e concorre à vaga na instituição, cidade e curso que escolheu
              no momento da inscrição.
            </p>
            <p>
              Na prática, isso funciona parecido com um "vestibular guarda-chuva": a prova é a mesma pra todo mundo, mas
              cada instituição participante define suas próprias vagas, notas de corte e cursos oferecidos por campus.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm leading-relaxed">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
              Instituições que usam o vestibular ACAFE
            </h3>
            <p className="text-[#475569] dark:text-[#cbd5e1] mb-3">
              A lista inclui universidades e centros universitários espalhados por várias regiões de Santa Catarina:
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {['FURB', 'UNIVALI', 'UNOESC', 'UNESC', 'UNISUL', 'UNIVILLE', 'UnC', 'UNIDAVI', 'UNIFEBE', 'UNIPLAC', 'Uniarp', 'Unibave', 'Católica de SC'].map(u => (
                <span key={u} className="bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#334155] px-2.5 py-1 rounded-md font-semibold text-[#4f46e5] dark:text-[#818CF8]">
                  {u}
                </span>
              ))}
            </div>
            <p className="text-xs text-[#a0a3af] dark:text-[#6b7385] mt-3">
              A lista de participantes pode variar a cada edição — confirme sempre no edital vigente quais instituições
              e campi estão com vagas abertas no ano da sua prova.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <CampusImage
            variant="polaroid-tilt"
            src="https://upload.wikimedia.org/wikipedia/commons/3/34/Furb.jpg"
            alt="Campus da FURB (Universidade Regional de Blumenau), uma das instituições do consórcio ACAFE"
            caption="Campus da FURB, Blumenau"
            credit="Foto: Wikimedia Commons, CC BY-SA 3.0"
          />
          <CampusImage
            variant="diagonal-strip"
            src="https://upload.wikimedia.org/wikipedia/commons/7/74/Fachada_do_Museu_Oceanogr%C3%A1fico_Univali.jpg"
            alt="Fachada do Museu Oceanográfico da UNIVALI, em Itajaí, instituição que também integra o consórcio ACAFE"
            caption="Museu Oceanográfico da UNIVALI, Itajaí"
            credit="Foto: Rômulo Porthos / Wikimedia Commons, CC BY-SA 4.0"
          />
        </div>
      </section>

      {/* Seção 2: Como se inscrever */}
      <section className="bg-white dark:bg-[#151f38] border border-[#E2E8F0] dark:border-[#1e2d4a] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            Como funciona a inscrição
          </h2>
          <div className="text-sm text-[#475569] dark:text-[#94a3b8] mt-4 space-y-4 leading-relaxed">
            <p>
              A inscrição é feita <strong>exclusivamente pela internet</strong>, no site oficial da ACAFE, dentro do
              prazo definido em edital. Durante o preenchimento, você escolhe três coisas importantes: o <strong>curso</strong>,
              a <strong>instituição</strong> e a <strong>cidade</strong> onde vai fazer a prova — então vale pesquisar
              antes qual campus oferece o curso que você quer.
            </p>
            <p>
              Depois de preencher os dados, é preciso gerar o boleto e pagar a <strong>taxa de inscrição</strong> dentro
              do prazo (que costuma fechar poucos dias depois do fim das inscrições). Sem o pagamento confirmado, a
              inscrição não é validada. O local de prova só é liberado pra consulta mais perto da data do exame.
            </p>
          </div>
        </div>

        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#4f46e5] dark:text-[#818CF8]">Vestibular de Verão</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Inscrições em setembro do ano anterior, prova em novembro, ingresso no 1º semestre</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#4f46e5] dark:text-[#818CF8]">Vestibular de Inverno</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Inscrições em abril, prova em junho, ingresso no 2º semestre</dd>
          </div>
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#6b7385]">
          Datas exatas mudam a cada edição — confirme sempre no edital vigente em{' '}
          <a href="https://www.acafe.org.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            acafe.org.br
          </a>.
        </p>
      </section>

      {/* Seção 3: ACAFE x ENEM */}
      <section className="bg-white dark:bg-[#151f38] border border-[#E2E8F0] dark:border-[#1e2d4a] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            ACAFE x ENEM: qual a diferença?
          </h2>
          <div className="text-sm text-[#475569] dark:text-[#94a3b8] mt-4 space-y-4 leading-relaxed">
            <p>
              É fácil confundir os dois porque ambos são "provas que abrem várias portas", mas eles funcionam de jeitos
              opostos. O <strong>ENEM</strong> é um exame nacional único, aplicado pelo INEP/MEC em todo o Brasil, e
              sua nota serve como moeda de troca em sistemas como SiSU, ProUni e FIES — ou seja, um exame, aceito por
              milhares de instituições públicas e privadas no país inteiro. Já o <strong>ACAFE</strong> é um vestibular
              regional, restrito às instituições particulares catarinenses que fazem parte do consórcio: você faz uma
              prova específica da ACAFE, e a nota só vale pra essas instituições.
            </p>
            <p>
              Outra diferença prática é o formato e o calendário. O ENEM acontece uma vez por ano, em novembro, dividido
              em dois domingos. O ACAFE costuma ter <strong>duas edições anuais</strong> (Verão e Inverno), com prova
              aplicada num único dia.
            </p>
          </div>
        </div>

        <div className="bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e] rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-base text-[#4f46e5] dark:text-[#818CF8]">
            ACAFE não usa TRI — a correção é bem mais direta
          </h3>
          <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
            Aqui mora a diferença mais importante pra quem vai estudar: o ENEM usa a TRI (Teoria de Resposta ao Item),
            que pesa a coerência do seu padrão de acertos e pune quem chuta questões difíceis mas erra as fáceis. O
            <strong> ACAFE não usa TRI</strong> — a nota é calculada por soma direta de acertos, com peso definido no
            edital pra cada disciplina (as fórmulas de classificação ficam detalhadas no edital de cada edição). Isso
            muda a estratégia de prova: no ACAFE, cada questão certa vale o mesmo peso fixo dentro da sua disciplina,
            sem o efeito de "questão difícil valendo menos se seu padrão for inconsistente" que existe no ENEM.
          </p>
          <div className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
            <p>
              Na prática, muita gente de Santa Catarina faz os dois: usa o ENEM pra tentar vaga em federais/estaduais
              via SiSU e bolsa via ProUni, e faz o ACAFE como plano B (ou A) pras particulares da região — já que são
              processos totalmente independentes, com inscrições, taxas e calendários próprios.
            </p>
          </div>
        </div>
      </section>
    </div>
  )

  return <UniversityBasePage slug="acafe" customContent={customContent} />
}
