import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const CIDADES = [
  'São Paulo', 'São Vicente', 'Araraquara', 'Assis', 'Bauru', 'Botucatu', 'Dracena',
  'Franca', 'Guaratinguetá', 'Ilha Solteira', 'Itapeva', 'Jaboticabal', 'Marília',
  'Ourinhos', 'Presidente Prudente', 'Registro', 'Rio Claro', 'Rosana', 'São João da Boa Vista',
  'São José do Rio Preto', 'São José dos Campos', 'Sorocaba', 'Tupã',
]

const INGRESSO = [
  { via: 'Vestibular tradicional (VUNESP)', fatia: '~85%', texto: 'Duas fases: objetiva geral em novembro e dissertativa/redação em dezembro.' },
  { via: 'Unesp-Enem', fatia: '~10%', texto: 'Seleção direta pela nota do ENEM, sem prova adicional.' },
  { via: 'Vestibular de Meio de Ano + Vagas Olímpicas', fatia: '~5%', texto: 'Janelas complementares de ingresso, com regras e calendário próprios.' },
]

export default function UnespPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade pública estadual — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        UNESP: ensino superior público levado a 24 cidades de São Paulo
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-10 max-w-2xl">
        Criada em 1976 pela fusão de institutos isolados já espalhados pelo interior paulista, a UNESP é
        universidade <strong>pública e gratuita</strong>, mantida pelo governo do estado de São Paulo. Seu maior
        diferencial estrutural é a <strong>descentralização</strong>: em vez de concentrar tudo na capital, a
        universidade segue um modelo multicampi inspirado na Universidade da Califórnia, com unidades em 21 cidades
        do interior, além de São Paulo e do litoral (São Vicente) — hoje a maior rede de universidade pública
        estadual do Brasil em número de cidades atendidas.
      </p>

      {/* Mapa de cidades em formato de "selo/carimbo", mesmo padrão da UDESC */}
      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-3">
          34 faculdades e institutos em 24 cidades paulistas
        </h3>
        <div className="flex flex-wrap gap-2">
          {CIDADES.map(c => (
            <span key={c} className="text-sm font-semibold text-[#4f46e5] dark:text-[#818CF8] border-2 border-dashed border-[#c5c5d3] dark:border-[#334155] rounded-lg px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
        <p className="text-xs text-[#a0a3af] dark:text-[#6b7385] mt-3">
          Cada unidade tem cursos próprios voltados à vocação da região — Medicina Veterinária e Agronomia em
          Botucatu e Jaboticabal, Comunicação em Bauru, Geociências em Rio Claro — sem uma sede única concentrando
          toda a estrutura acadêmica.
        </p>
      </div>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/9/9d/Neblina%2C_Universidade_Estadual_Paulista_Julio_de_Mesquita_Filho%2C_campus_Rio_Claro_-_SP.jpg"
        alt="Campus da UNESP em Rio Claro, em dia de neblina"
        caption="Campus da UNESP, Rio Claro"
        credit="Foto: Tatiane Aparecida Domingues da Silva / Wikimedia Commons, CC BY-SA 4.0"
      />

      {/* Barra de composição de vagas por forma de ingresso, mesmo padrão da UDESC */}
      <div className="my-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-3">Como as vagas são divididas</h3>
        <div className="flex rounded-full overflow-hidden h-7 text-[10px] font-bold text-white mb-4">
          <div className="bg-[#4f46e5] dark:bg-[#712ae2] flex items-center justify-center" style={{ width: '85%' }}>VUNESP ~85%</div>
          <div className="bg-[#712ae2] dark:bg-[#8b5cf6] flex items-center justify-center" style={{ width: '10%' }}>Enem ~10%</div>
          <div className="bg-[#818CF8] dark:bg-[#A5B4FC] flex items-center justify-center text-[#1E293B]" style={{ width: '5%' }}>Outros 5%</div>
        </div>
        <dl className="space-y-3 text-sm">
          {INGRESSO.map(i => (
            <div key={i.via} className="flex gap-3">
              <dt className="font-bold text-[#1E293B] dark:text-white shrink-0 w-64">{i.via}</dt>
              <dd className="text-[#475569] dark:text-[#94a3b8]">{i.texto}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#6b7385] mt-3">
          A VUNESP é a fundação responsável por organizar o vestibular tradicional. Metade das vagas de cada curso
          é reservada a candidatos de escola pública, com 35% dessa reserva pra autodeclarados pretos, pardos ou
          indígenas. Datas e proporção exata mudam a cada edital — confirme sempre em{' '}
          <a href="https://www.vunesp.com.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            vunesp.com.br
          </a>.
        </p>
      </div>

      <CampusImage
        variant="polaroid-tilt"
        src="https://upload.wikimedia.org/wikipedia/commons/2/27/Unesp_Bauru.jpg"
        alt="Campus da UNESP em Bauru (SP)"
        caption="Campus da UNESP, Bauru"
        credit="Foto: Hernani Arruda Monteiro da Silva / Wikimedia Commons, CC BY 2.0"
      />

      {/* Cursos e pesquisa lado a lado, mesmo padrão da UDESC */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">Cursos mais fortes</h3>
          <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
            São 136 cursos de graduação, com tradição consolidada em <strong>Medicina</strong>,{' '}
            <strong>Medicina Veterinária</strong>, <strong>Agronomia</strong>, <strong>Odontologia</strong>,{' '}
            <strong>Comunicação Social</strong> e <strong>Educação Física</strong> — áreas em que a universidade
            é referência nacional, sobretudo em ciências agroveterinárias e comunicação.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">Pesquisa e extensão</h3>
          <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
            Além da graduação, a UNESP mantém cerca de <strong>150 programas de pós-graduação</strong> e mais de
            3.000 professores. São mais de <strong>500 projetos de extensão</strong> em andamento, levando
            conhecimento produzido na universidade direto à comunidade em todo o interior paulista.
          </p>
        </div>
      </div>
    </div>
  )

  return <UniversityBasePage slug="unesp" customContent={customContent} />
}
