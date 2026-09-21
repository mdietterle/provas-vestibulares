import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const NOTA5 = ['Medicina', 'Enfermagem']

export default function UnimontesPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade pública estadual — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        Unimontes: referência pública do norte de Minas
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8 max-w-2xl">
        Credenciada pelo MEC em 1962, a Universidade Estadual de Montes Claros é a principal universidade pública
        do norte mineiro, com sede em Montes Claros e atuação em diversos campi da região. Oferece 35 cursos de
        graduação, além de pós-graduação e cursos técnicos, presenciais e a distância.
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/f/f8/Guazuma_ulmifolia-_Campus_Unimontes-_Montes_Claros.jpg"
        alt="Área verde do campus da Unimontes, em Montes Claros (MG)"
        caption="Campus da Unimontes, Montes Claros"
        credit="Foto: Ane Sasil / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 my-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: nota máxima em Medicina e Enfermagem no ENADE
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          No Exame Nacional de Desempenho dos Estudantes (ENADE) 2023, seis cursos da Unimontes se destacaram, com{' '}
          <strong>Medicina</strong> e <strong>Enfermagem</strong> recebendo nota máxima (5). O IGC (Índice Geral de
          Cursos) da universidade também subiu de 3 para 4 no MEC — uma evolução consistente de qualidade, não só
          um pico isolado num curso.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {NOTA5.map(c => (
            <span key={c} className="text-xs font-semibold text-[#4f46e5] dark:text-[#818CF8] bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#334155] rounded-full px-3 py-1">
              {c} — nota 5 no ENADE 2023
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8">
        Além de Medicina e Enfermagem, cursos de destaque incluem <strong>Direito</strong>,{' '}
        <strong>Odontologia</strong>, <strong>Engenharia Civil</strong>, <strong>Engenharia
        Elétrica/Eletrônica</strong> e <strong>Psicologia</strong>. A universidade também investe forte em
        prestação de serviços à comunidade como parte da formação prática dos estudantes, unindo pesquisa e
        extensão à rotina de ensino.
      </p>

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Ingresso: vestibular próprio (80%) ou SiSU (20%)
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A Unimontes reserva <strong>80% das vagas</strong> pro vestibular próprio, aplicado pela COTEPS
          (Coordenação Técnica de Processos Seletivos) e aberto tanto a quem já concluiu o ensino médio quanto a
          quem está no 3º ano. Os outros <strong>20%</strong> vão pro <strong>SiSU</strong>, com dois processos
          seletivos por ano (início de cada semestre), sempre em ampla concorrência. Datas mudam a cada edital —
          confirme sempre em{' '}
          <a href="https://www.coteps.unimontes.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            coteps.unimontes.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="unimontes" customContent={customContent} />
}
