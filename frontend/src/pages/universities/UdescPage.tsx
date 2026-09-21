import UniversityBasePage from './UniversityBasePage'

const CENTROS = [
  'Florianópolis', 'Joinville', 'Lages', 'Balneário Camboriú', 'Caçador',
  'Chapecó', 'Ibirama', 'Laguna', 'Pinhalzinho', 'São Bento do Sul',
]

const INGRESSO = [
  { via: 'Vestibular próprio (COVEST)', fatia: '50%', texto: 'Prova presencial tradicional, aplicada nas edições de Verão e de Inverno.' },
  { via: 'Análise de histórico escolar', fatia: '25%', texto: 'Seleção pelo desempenho ao longo do ensino médio, sem prova adicional.' },
  { via: 'SiSU (nota do ENEM)', fatia: '25%', texto: 'Vagas distribuídas via Sistema de Seleção Unificada, mesmo sistema usado por federais.' },
]

export default function UdescPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      {/* Selo de destaque: pública estadual — logo no topo, formato de etiqueta, diferente das outras páginas */}
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade pública estadual — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        UDESC: ensino superior público levado a dez cidades de Santa Catarina
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#c7c4d7] mb-10 max-w-2xl">
        Fundada em 1965 e mantida pelo governo do estado, a UDESC é universidade <strong>pública e gratuita</strong> —
        diferente das instituições privadas catarinenses do consórcio ACAFE. Seu maior diferencial estrutural é a{' '}
        <strong>descentralização</strong>: em vez de concentrar tudo na capital, a universidade espalhou seus 13
        centros de ensino por dez municípios, aproximando o ensino superior público de regiões que dificilmente
        teriam acesso a uma universidade estadual só na capital.
      </p>

      {/* Mapa de cidades em formato de "selo/carimbo", não em cards nem faixa rolável — visual de rede espalhada */}
      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-3">
          13 centros de ensino em 10 cidades catarinenses
        </h3>
        <div className="flex flex-wrap gap-2">
          {CENTROS.map(c => (
            <span key={c} className="text-sm font-semibold text-[#4f46e5] dark:text-[#818CF8] border-2 border-dashed border-[#c5c5d3] dark:border-[#c7c4d7] rounded-lg px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
        <p className="text-xs text-[#a0a3af] dark:text-[#908fa0] mt-3">
          O campus de Florianópolis (bairro Itacorubi) é a sede histórica e concentra a maior infraestrutura, mas
          cada cidade-polo tem cursos próprios voltados às vocações econômicas da região — da produção agropecuária
          no interior às artes e ao esporte na capital.
        </p>
      </div>

      {/* Barra de composição de vagas por forma de ingresso — visualização de proporção, diferente das outras páginas */}
      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-3">Como as vagas são divididas</h3>
        <div className="flex rounded-full overflow-hidden h-7 text-[10px] font-bold text-white mb-4">
          <div className="bg-[#4f46e5] dark:bg-[#712ae2] flex items-center justify-center" style={{ width: '50%' }}>Vestibular 50%</div>
          <div className="bg-[#712ae2] dark:bg-[#8b5cf6] flex items-center justify-center" style={{ width: '25%' }}>Histórico 25%</div>
          <div className="bg-[#818CF8] dark:bg-[#A5B4FC] flex items-center justify-center text-[#1E293B]" style={{ width: '25%' }}>SiSU 25%</div>
        </div>
        <dl className="space-y-3 text-sm">
          {INGRESSO.map(i => (
            <div key={i.via} className="flex gap-3">
              <dt className="font-bold text-[#1E293B] dark:text-white shrink-0 w-48">{i.via}</dt>
              <dd className="text-[#475569] dark:text-[#c7c4d7]">{i.texto}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#908fa0] mt-3">
          A COVEST (Comissão Permanente do Vestibular) é o órgão responsável por organizar o vestibular tradicional.
          Datas e proporção exata de vagas mudam a cada edital — confirme sempre em{' '}
          <a href="https://www.udesc.br/vestibular" target="_blank" rel="noreferrer" className="underline font-semibold">
            udesc.br/vestibular
          </a>.
        </p>
      </div>

      {/* Cursos e pesquisa lado a lado, formato de duas colunas simples */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">Cursos mais fortes</h3>
          <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
            Mais de 60 cursos de graduação, com tradição consolidada em <strong>Fisioterapia</strong>,{' '}
            <strong>Educação Física</strong>, <strong>Medicina Veterinária</strong>, <strong>Design</strong> e{' '}
            <strong>Zootecnia</strong> — áreas em que a universidade é referência nacional, sobretudo em ciências
            do esporte e ciências agroveterinárias.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">Pesquisa e extensão</h3>
          <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
            Além da graduação, a UDESC mantém mais de 50 programas de mestrado e doutorado. São cerca de{' '}
            <strong>1.200 atividades de extensão por ano</strong>, levando conhecimento produzido na universidade
            direto à comunidade — ações gratuitas que já beneficiam mais de 600 mil pessoas anualmente em Santa
            Catarina.
          </p>
        </div>
      </div>
    </div>
  )

  return <UniversityBasePage slug="udesc" customContent={customContent} />
}
