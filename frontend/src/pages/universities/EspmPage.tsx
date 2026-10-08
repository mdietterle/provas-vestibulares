import UniversityBasePage from './UniversityBasePage'

export default function EspmPage() {
  const customContent = (
    <div className="space-y-10 mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      {/* Banner Principal */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-800 to-amber-500 text-white p-6 sm:p-10 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-yellow-300 bg-white/10 px-3 py-1 rounded-full mb-3">
            Tudo o que você precisa saber
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-white leading-tight">
            ESPM: referência nacional em Comunicação, Marketing e Negócios
          </h2>
          <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-2xl font-normal">
            Com mais de 75 anos de história, a ESPM é hoje uma das instituições mais respeitadas do Brasil pra quem
            quer estudar Publicidade, Marketing, Design, Jornalismo e áreas de negócios com forte conexão com o
            mercado.
          </p>
        </div>
      </div>

      {/* Seção 1: O que é e onde fica */}
      <section className="bg-white dark:bg-[#191b23] border border-[#E2E8F0] dark:border-[#464554] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            O que é a ESPM
          </h2>
          <div className="text-sm text-[#475569] dark:text-slate-300 mt-4 space-y-4 leading-relaxed">
            <p>
              A ESPM (Escola Superior de Propaganda e Marketing) foi fundada em 1951, em São Paulo, por um grupo de
              publicitários e profissionais de mídia — sendo pioneira no ensino de Propaganda e Marketing no Brasil.
              Desde então, se consolidou como uma das instituições privadas mais respeitadas do país nessas áreas,
              formando gerações de profissionais que hoje ocupam posições de destaque em agências, marcas e empresas
              de todos os portes.
            </p>
            <p>
              Hoje a ESPM tem <strong>cinco campi</strong>: dois em São Paulo (Álvaro Alvim e Tech Joaquim Távora),
              um no Rio de Janeiro (Glória-Villa Aymoré), um em Porto Alegre e um em Florianópolis. Essa presença em
              diferentes regiões do país amplia o alcance de uma instituição historicamente ligada ao eixo
              Rio-São Paulo pra outros polos importantes de comunicação e negócios no Brasil.
            </p>
          </div>
        </div>
      </section>

      {/* Seção 2: Cursos */}
      <section className="bg-white dark:bg-[#191b23] border border-[#E2E8F0] dark:border-[#464554] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            Principais cursos
          </h2>
          <p className="text-sm text-[#475569] dark:text-slate-300 mt-4 leading-relaxed">
            A grade de graduação combina o DNA histórico da escola em comunicação com áreas de negócios e tecnologia
            que vêm crescendo bastante nos últimos anos:
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {['Publicidade e Propaganda', 'Administração', 'Design', 'Jornalismo', 'Cinema e Audiovisual', 'Ciência de Dados e Negócios', 'Relações Internacionais', 'Direito', 'Ciências Sociais e do Consumo'].map(c => (
            <span key={c} className="bg-[#F4F6F9] dark:bg-[#10131a] border border-[#cbd5e1] dark:border-slate-300 px-2.5 py-1 rounded-md font-semibold text-teal-600 dark:text-teal-400">
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Seção: Processo seletivo */}
      <section className="bg-white dark:bg-[#191b23] border border-[#E2E8F0] dark:border-[#464554] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            Como entrar: vestibular próprio ou nota do ENEM?
          </h2>
          <p className="text-sm text-[#475569] dark:text-slate-300 mt-4 leading-relaxed">
            A ESPM tem duas portas de entrada, e o candidato pode tentar as duas ao mesmo tempo:
          </p>
        </div>

        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <dt className="font-bold text-teal-600 dark:text-teal-400">Vestibular próprio</dt>
            <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">
              Formato híbrido: etapa online e etapa presencial, com entrevista individual com um professor da ESPM e
              redação de até 400 palavras.
            </dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <dt className="font-bold text-teal-600 dark:text-teal-400">Nota do ENEM</dt>
            <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">
              Vale nota do ENEM de qualquer edição, desde que média geral mínima de 580 pontos e mínimo de 600 pontos
              em redação — as duas notas precisam vir do mesmo exame.
            </dd>
          </div>
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#908fa0]">
          Quem se inscreve pela nota do ENEM também pode participar do vestibular próprio — se não passar por um
          caminho, ainda concorre pelo outro. Datas, taxas e formato exato variam a cada edição; confirme sempre em{' '}
          <a href="https://www.espm.br/cursos-de-graduacao/processos-seletivos/" target="_blank" rel="noreferrer" className="underline font-semibold">
            espm.br/processos-seletivos
          </a>.
        </p>
      </section>

      {/* Seção 3: Referência */}
      <section className="bg-white dark:bg-[#191b23] border border-[#E2E8F0] dark:border-[#464554] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            Por que a ESPM é referência
          </h2>
        </div>
        <div className="bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554] rounded-2xl p-5 space-y-3">
          <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
            A ESPM é reconhecida no mercado como a principal escola de <strong>Publicidade e Propaganda</strong> do
            Brasil, com curso historicamente bem avaliado em rankings de mercado, e conta com nota máxima (4) no
            Índice Geral de Cursos (IGC) do MEC — indicador que mede a qualidade do ensino superior de uma instituição
            acima da média nacional. Seus egressos são disputados por agências, grandes marcas e empresas de
            tecnologia, e a proximidade com o mercado publicitário e de marketing é parte da identidade da escola
            desde sua fundação.
          </p>
        </div>
      </section>
    </div>
  )

  return <UniversityBasePage slug="espm" customContent={customContent} />
}
