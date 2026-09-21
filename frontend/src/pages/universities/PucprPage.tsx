import UniversityBasePage from './UniversityBasePage'

const CAMPI = [
  { cidade: 'Curitiba', destaque: 'Campus principal, sede histórica, mais de 70 opções de curso incluindo Medicina' },
  { cidade: 'Londrina', destaque: 'Segunda maior unidade, forte em Direito e Engenharias' },
  { cidade: 'Maringá', destaque: 'Unidade regional no noroeste do Paraná' },
  { cidade: 'Toledo', destaque: 'Unidade no oeste do estado, próxima à fronteira com Argentina e Paraguai' },
]

const INGRESSO = [
  'Vestibular tradicional (prova presencial)',
  'Vestibular agendado (o candidato escolhe o dia)',
  'Nota do ENEM',
  'Transferência de outra instituição',
  'Isenção por diploma (quem já tem graduação)',
]

export default function PucprPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      {/* Faixa de título simples, sem banner gradiente */}
      <div className="border-l-4 border-[#712ae2] pl-4 mb-8">
        <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white">PUCPR: um só nome, quatro cidades</h2>
        <p className="text-sm text-[#64748B] dark:text-[#94a3b8] mt-1">
          Uma das maiores universidades privadas confessionais do Sul do país, com presença espalhada pelo Paraná.
        </p>
      </div>

      {/* Explorador de campi — faixa horizontal roláveis, formato distinto das outras páginas */}
      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-3">Onde a PUCPR está</h3>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
          {CAMPI.map(c => (
            <div key={c.cidade} className="shrink-0 w-64 rounded-2xl border border-[#E2E8F0] dark:border-[#1e2d4a] bg-white dark:bg-[#151f38] p-5">
              <div className="text-lg font-bold text-[#1E293B] dark:text-white mb-1">{c.cidade}</div>
              <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">{c.destaque}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-10">
        Mantida pela Sociedade Paranaense de Educação e Cultura, a PUCPR reúne mais de 70 opções de curso de
        graduação entre os quatro campi, com destaque histórico em <strong>Direito</strong>, <strong>Medicina</strong>{' '}
        e forte tradição em <strong>Engenharias, Arquitetura e Design</strong> — áreas que puxam boa parte da
        infraestrutura de laboratórios e espaços de convivência da universidade.
      </p>

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 mb-10">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Uma fundação anterior à própria universidade
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A história da PUCPR começa antes de 1959, ano oficial de fundação: já existiam a Escola de Enfermagem
          Madre Léoni (1953), a Faculdade Católica de Direito e a Faculdade de Ciências Médicas (ambas 1956),
          reunidas depois com a Faculdade de Ciências Econômicas pra formar a universidade. Recebeu o título de
          Pontifícia em 1985. Hoje tem nota 4 no Índice Geral de Cursos (IGC) do MEC, ocupando a{' '}
          <strong>7ª colocação entre as universidades privadas do Brasil</strong> e a 1ª do Paraná no ranking IGC —
          com cursos como Farmácia e Nutrição avaliados com nota máxima em avaliações recentes do MEC. A pesquisa
          é incentivada por bolsas de iniciação científica (PIBIC/PIBITI) financiadas pelo CNPq, pela Fundação
          Araucária e pela própria instituição, além de programas de mobilidade internacional.
        </p>
      </div>

      {/* Lista simples de formas de ingresso, sem cards nem tabela */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-3">Como entrar</h3>
        <ul className="divide-y divide-[#E2E8F0] dark:divide-[#1e2d4a] border-y border-[#E2E8F0] dark:border-[#1e2d4a]">
          {INGRESSO.map(i => (
            <li key={i} className="py-3 text-sm text-[#475569] dark:text-[#94a3b8] flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#712ae2] shrink-0" />
              {i}
            </li>
          ))}
        </ul>
        <p className="text-xs text-[#a0a3af] dark:text-[#6b7385] mt-3">
          Cada modalidade tem datas e requisitos próprios por campus e curso — confirme sempre em{' '}
          <a href="https://www.vestibular.pucpr.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            vestibular.pucpr.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="pucpr" customContent={customContent} />
}
