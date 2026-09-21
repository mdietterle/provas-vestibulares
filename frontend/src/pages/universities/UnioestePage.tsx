import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const MODALIDADES = ['Padrão', 'Seriado/Plurianual', 'Treineiro', 'Prova Paraná']

export default function UnioestePage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade pública estadual — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        UNIOESTE: 8ª melhor universidade estadual do Brasil
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#c7c4d7] mb-8 max-w-2xl">
        A Universidade Estadual do Oeste do Paraná é multicampi, com unidades em Cascavel, Foz do Iguaçu, Toledo,
        Marechal Cândido Rondon e Francisco Beltrão, reunindo mais de 12.900 estudantes entre graduação e
        pós-graduação. Oferece 55 cursos de graduação e cerca de 24 programas de pós-graduação (stricto e lato
        sensu).
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/a/ab/UNIOESTE_FB.jpg"
        alt="Prédio da UNIOESTE, campus Francisco Beltrão"
        caption="Campus Francisco Beltrão, UNIOESTE"
        credit="Foto: Wikimedia Commons, domínio público"
      />

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 my-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: entre as 10 melhores estaduais do Brasil, com nota 4 no IGC/MEC
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
          A UNIOESTE ocupa a <strong>8ª posição entre as universidades estaduais do país</strong>, com todas as
          competências avaliadas pelo MEC acima de 3, e nota 4 no Índice Geral de Cursos (IGC) — um desempenho
          consistente numa universidade multicampi de porte médio.
        </p>
      </div>

      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Envolvimento com a comunidade: mais de 930 mil pessoas alcançadas
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
          A universidade mantém mais de <strong>360 projetos de extensão</strong>, alcançando cerca de 930 mil
          pessoas no oeste e sudoeste do Paraná, além de 38 programas de extensão que chegam a mais de{' '}
          <strong>2 milhões de paranaenses</strong>. Entre os destaques está a <strong>UNATI</strong>
          (Universidade Aberta à Terceira Idade), voltada a atividades de ensino, pesquisa e extensão pra pessoas
          idosas, e um programa institucional de ações pra pessoas com deficiência, focado em garantir matrícula e
          permanência no ensino superior.
        </p>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#c7c4d7] mb-8">
        Cursos de destaque incluem <strong>Medicina</strong> (tradicionalmente o mais concorrido, em Cascavel),{' '}
        <strong>Engenharia Civil</strong>, <strong>Odontologia</strong>, <strong>Direito</strong>,{' '}
        <strong>Psicologia</strong> e <strong>Agronomia</strong> — perfil que reflete tanto a força do agronegócio
        na região quanto a demanda por profissionais de saúde e humanas.
      </p>

      <div className="border-t border-[#E2E8F0] dark:border-[#464554] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-3">
          Ingresso: vestibular próprio (CVU) com quatro modalidades
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed mb-3">
          O vestibular da UNIOESTE, o <strong>CVU (Concurso Vestibular Unificado)</strong>, tem prova em duas
          etapas no mesmo dia — manhã com Redação + 27 questões de Conhecimentos Gerais, tarde com mais 72 questões
          de Conhecimentos Gerais — e o candidato escolhe entre quatro modalidades de participação:
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {MODALIDADES.map(m => (
            <span key={m} className="text-sm font-semibold text-[#4f46e5] dark:text-[#818CF8] border-2 border-dashed border-[#c5c5d3] dark:border-[#c7c4d7] rounded-lg px-3 py-1.5">
              {m}
            </span>
          ))}
        </div>
        <p className="text-xs text-[#a0a3af] dark:text-[#908fa0]">
          Taxa de inscrição entre R$ 85 e R$ 199, dependendo da modalidade escolhida — 1.481 vagas oferecidas na
          edição mais recente. Datas mudam a cada edital — confirme sempre em{' '}
          <a href="https://www.unioeste.br/portal/" target="_blank" rel="noreferrer" className="underline font-semibold">
            unioeste.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="unioeste" customContent={customContent} />
}
