import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function UfjfPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade pública federal — educação gratuita de qualidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        UFJF: referência do interior mineiro, entre as melhores da América Latina
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8 max-w-2xl">
        A Universidade Federal de Juiz de Fora tem sede em Juiz de Fora (MG) e é uma das principais instituições
        públicas do interior mineiro. Está classificada entre as melhores universidades da América Latina, com
        reconhecimento nacional e internacional pela qualidade do ensino, investimento em pesquisa e forte atuação
        em extensão.
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/a/ad/Campus_ufjf_01.jpg"
        alt="Vista do campus da Universidade Federal de Juiz de Fora"
        caption="Campus da UFJF, Juiz de Fora (MG)"
        credit="Foto: Py4nf / Wikimedia Commons, domínio público"
      />

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">Dois campi, dois estados de formação</h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          Além da sede em Juiz de Fora, a UFJF mantém um campus avançado em <strong>Governador Valadares</strong>{' '}
          (também em Minas Gerais), levando ensino federal pra uma região mineira relativamente distante da capital
          e da Zona da Mata. São 93 opções de curso de graduação, 36 mestrados e 17 doutorados ao todo, cobrindo
          humanas, exatas e biológicas.
        </p>
      </div>

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: Faculdade de Direito centenária, referência em aprovação na OAB
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A Faculdade de Direito de Juiz de Fora foi fundada em 1923 por um grupo de juristas locais, décadas antes
          da própria UFJF existir como universidade — e hoje é tradicionalmente reconhecida como escola de
          excelência em Direito, com desempenho consistentemente alto nos exames da OAB e nas avaliações de
          qualidade do MEC. É um caso raro de curso cuja reputação antecede a instituição que hoje o abriga.
        </p>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-10">
        Além de Direito, outros cursos de destaque incluem <strong>Medicina</strong>, <strong>Psicologia</strong>,{' '}
        <strong>Odontologia</strong>, <strong>Engenharias</strong>, <strong>Farmácia</strong> e{' '}
        <strong>Fisioterapia</strong> — áreas tradicionalmente entre as mais concorridas da universidade.
      </p>

      <CampusImage
        variant="polaroid-tilt"
        src="https://upload.wikimedia.org/wikipedia/commons/6/6a/Detalhe_Campus_UFJF.jpg"
        alt="Detalhe de um dos prédios acadêmicos do campus da UFJF"
        caption="Detalhe de prédio acadêmico, campus UFJF"
        credit="Foto: Mjmauler / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">
          Ligação direta com a população: extensão como ponte
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          Os programas e projetos de extensão da UFJF são pensados justamente pra articular ensino, pesquisa e
          demandas reais da sociedade — aproximando a comunidade universitária da população de Juiz de Fora e da
          Zona da Mata mineira. Isso se soma a uma política ativa de assistência estudantil (bolsas e apoio pra
          estudantes de baixa renda), o que ajuda a manter a universidade acessível a um público diverso, não só
          aos moradores da cidade-sede.
        </p>
      </div>

      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">
          Egressos de destaque
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed mb-3">
          O nome mais notável é <strong>Itamar Franco</strong>, ex-presidente do Brasil (1992–1995): formado em
          Engenharia Civil em 1955 pela Escola de Engenharia de Juiz de Fora, uma das instituições que, em 1960, se
          fundiram pra formar a própria UFJF — mesmo caso histórico da Faculdade de Direito, escolas que já existiam
          antes da universidade e depois foram incorporadas a ela.
        </p>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A UFJF instituiu a Medalha JK justamente pra homenagear personalidades notáveis ligadas à instituição. Um
          exemplo é <strong>Izak Carlos da Silva</strong>, mestre e doutor em Economia Aplicada pela
          UFJF, hoje Economista-Chefe do Banco de Desenvolvimento de Minas Gerais (BDMG) — reflexo direto da
          tradição da universidade em formar quadros técnicos pro serviço público e pra área econômica de Minas
          Gerais.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-3">
          Como entrar: PISM (seriado) ou SiSU
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed mb-4">
          O principal vestibular próprio é o <strong>PISM</strong> (Programa de Ingresso Seletivo Misto), um
          processo seriado que acompanha o estudante ao longo de todo o ensino médio, com desempenho construído em
          três módulos independentes (cada um ligado a um triênio diferente do ensino médio). A outra via de
          ingresso é o <strong>SiSU</strong>, com nota do ENEM.
        </p>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Isenção da taxa</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Meados de junho, resultado no início de julho</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Inscrições PISM</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Fim de julho a meados de agosto</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Provas (3 módulos)</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Início de dezembro, mesma data pros três módulos</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Vagas</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">~2.246 no total: 1.846 em Juiz de Fora, 400 em Governador Valadares</dd>
          </div>
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#6b7385] mt-3">
          Datas mudam a cada edital — confirme sempre no site da COPESE (Coordenação Geral de Processos Seletivos)
          em{' '}
          <a href="https://www2.ufjf.br/copese/" target="_blank" rel="noreferrer" className="underline font-semibold">
            ufjf.br/copese
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufjf" customContent={customContent} />
}
