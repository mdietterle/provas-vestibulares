import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function UfsmPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <div className="bg-[#1E293B] dark:bg-[#0F172A] text-white rounded-2xl p-6 sm:p-8 mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-yellow-300">Um marco na história do ensino público</span>
        <p className="text-sm sm:text-base text-white/90 leading-relaxed mt-2">
          Criada em 14 de dezembro de 1960, a UFSM foi a <strong>primeira universidade federal do Brasil fundada
          fora de uma capital</strong> — um marco no processo de interiorização do ensino superior público, que
          também fez do Rio Grande do Sul o primeiro estado do país com duas universidades federais.
        </p>
      </div>

      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Pública federal — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">UFSM: Santa Maria e mais três cidades gaúchas</h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8 max-w-2xl">
        Além da sede em Santa Maria (RS), a UFSM tem campi em Frederico Westphalen, Palmeira das Missões e Cachoeira
        do Sul — espalhando ensino federal por diferentes regiões do estado.
      </p>

      <CampusImage
        variant="polaroid-tilt"
        src="https://upload.wikimedia.org/wikipedia/commons/3/32/Antiga_Reitoria_da_UFSM_em_constru%C3%A7%C3%A3o%2C_Santa_Maria%2C_Centro.jpg"
        alt="Antiga Reitoria da UFSM em construção, no centro de Santa Maria"
        caption="Antiga Reitoria da UFSM, Santa Maria"
        credit="Foto: Wikimedia Commons, CC BY-SA 4.0"
      />

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8">
        São 127 cursos de graduação (24 licenciaturas presenciais, 78 bacharelados, 11 tecnólogos, além de 12
        licenciaturas EaD) e 108 cursos de pós-graduação. Áreas de destaque histórico incluem{' '}
        <strong>Medicina</strong>, <strong>Odontologia</strong>, <strong>Agronomia</strong>,{' '}
        <strong>Medicina Veterinária</strong> e <strong>Engenharias</strong>.
      </p>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Avaliação MEC: nota máxima mantida e cursos 5 estrelas
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A UFSM mantém <strong>nota máxima (5) no Índice Geral de Cursos (IGC)</strong> do MEC pela segunda vez
          consecutiva, e nenhum dos 31 cursos avaliados no Enade tirou conceito 1 ou 2 (insuficiente). No Enade
          2023, 15 cursos tiraram nota 5, incluindo <strong>Engenharia Florestal</strong>,{' '}
          <strong>Medicina Veterinária</strong> e <strong>Engenharia Civil</strong> — reflexo direto da força
          histórica da universidade em ciências agrárias e engenharias, áreas que também puxam a nota máxima em
          <strong> Agronomia</strong>, <strong>Arquitetura e Urbanismo</strong>, <strong>Enfermagem</strong>,{' '}
          <strong>Fonoaudiologia</strong> e <strong>Odontologia</strong> em ciclos anteriores.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Papel na região central do Rio Grande do Sul
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          Ser a primeira federal fundada fora de uma capital não foi só um marco simbólico: a UFSM levou pesquisa
          em ciências agrárias, saúde e engenharia pra uma região do RS que, sem essa descentralização, dificilmente
          concentraria hospital-escola, clínicas veterinárias e laboratórios de pesquisa de ponta fora de Porto
          Alegre. Hoje a universidade funciona como polo de atração de estudantes e profissionais qualificados pra
          Santa Maria e cidades vizinhas, sustentando parte relevante da economia local ligada a serviços de saúde
          e educação superior.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Ingresso: vestibular próprio ou SiSU
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A UFSM combina o vestibular próprio da <strong>COPERVES</strong> (múltipla escolha e redação, com
          inscrições ao longo do ano) e o <strong>SiSU</strong>, que segue o calendário nacional do MEC. Confirme
          sempre em{' '}
          <a href="https://www.coperves.ufsm.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            coperves.ufsm.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufsm" customContent={customContent} />
}
