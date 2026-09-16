import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function UerjPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade pública estadual — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        UERJ: uma das maiores e mais prestigiadas públicas do Brasil
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8 max-w-2xl">
        Fundada em 1950, a UERJ é uma universidade pública estadual com sede no Maracanã, Rio de Janeiro, e é
        reconhecida como uma das instituições mais prestigiadas do país e da América Latina. Foi pioneira no Brasil
        em políticas de cotas raciais e sociais no ensino superior, uma marca importante de sua identidade
        institucional.
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/f/f4/UERJ_campus_Maracan%C3%A3_%282024-07-20%29.jpg"
        alt="Campus do Maracanã da UERJ, no Rio de Janeiro, com o prédio principal em formato de torre"
        caption="Campus Maracanã, sede da UERJ"
        credit="Foto: Avelludo / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">Campi em nove cidades do estado</h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          Além da sede no Maracanã, a UERJ mantém unidades em oito outras cidades fluminenses. Destaques incluem a
          Faculdade de Formação de Professores, em São Gonçalo, e o Instituto de Estudos Sociais e Políticos (IESP),
          em Botafogo — um dos centros de pesquisa e pós-graduação mais tradicionais do país em Ciências Sociais,
          incorporado à UERJ em 2010.
        </p>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8">
        Entre os cursos mais concorridos estão <strong>Medicina</strong>, <strong>Direito</strong>,{' '}
        <strong>Engenharia</strong>, <strong>Jornalismo</strong> e <strong>Odontologia</strong> — Medicina
        historicamente lidera a procura em quase toda edição do vestibular.
      </p>

      <div className="rounded-2xl border-l-4 border-green-600 dark:border-green-500 bg-green-50 dark:bg-green-950/20 p-5 mb-10">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Estrutura: hospital de referência integrado ao SUS
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A UERJ mantém o Hospital Universitário Pedro Ernesto (HUPE), unidade de alta complexidade a poucos metros
          do campus, em Vila Isabel — referência em áreas como Pediatria, Urologia, Reumatologia, Dermatologia,
          Medicina de Família e Comunidade, Psiquiatria e Doenças Infecto-Parasitárias. É campo prático essencial
          pra formação dos cursos de saúde e, ao mesmo tempo, presta serviço direto à comunidade pelo SUS.
        </p>
      </div>

      <CampusImage
        variant="polaroid-tilt"
        src="https://upload.wikimedia.org/wikipedia/commons/2/2b/Hospital_Universit%C3%A1rio_Pedro_Ernesto_%28frente%29.jpg"
        alt="Fachada do Hospital Universitário Pedro Ernesto (HUPE), ligado à UERJ, em Vila Isabel, Rio de Janeiro"
        caption="Hospital Universitário Pedro Ernesto (HUPE)"
        credit="Foto: eurritimia / Flickr, via Wikimedia Commons, CC BY 2.0"
      />

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-10">
        Em pesquisa e produção acadêmica, a UERJ é reconhecida como uma das principais universidades do país, com
        produção científica consistente e forte engajamento social — reflexo direto de seu papel histórico de
        universidade pública voltada tanto à excelência acadêmica quanto à formação de profissionais que atuam
        diretamente na cidade do Rio de Janeiro.
      </p>

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-3">
          Como entrar: vestibular em duas fases independentes
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed mb-4">
          O ingresso é majoritariamente via vestibular próprio, conduzido pelo Depsea da UERJ. A primeira etapa é
          composta por <strong>dois Exames de Qualificação</strong> (objetivos, com questões de Linguagens,
          Matemática, Ciências da Natureza e Ciências Humanas) — é obrigatório participar de pelo menos um deles. O
          desempenho gera um conceito (A, B, C ou D) que garante ou não acesso à fase seguinte. Quem é aprovado em
          pelo menos uma das edições avança pro <strong>Exame Discursivo</strong>, que define a classificação final.
        </p>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">1º Exame de Qualificação</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Inscrição em abril/maio, prova em junho</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">2º Exame de Qualificação</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Inscrição em julho/agosto, prova em setembro</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Exame Discursivo</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">2ª fase, datas divulgadas depois dos Exames de Qualificação</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Resultado final</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Costuma sair em janeiro do ano seguinte</dd>
          </div>
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#6b7385] mt-3">
          Também há vagas via SiSU/ENEM em modalidades específicas. Datas e taxas mudam a cada edital — confirme
          sempre em{' '}
          <a href="https://www.vestibular.uerj.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            vestibular.uerj.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="uerj" customContent={customContent} />
}
