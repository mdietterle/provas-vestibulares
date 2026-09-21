import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const PREMIOS = [
  { ano: '2012', texto: 'Melhor universidade privada do Sul do Brasil (avaliação MEC)' },
  { ano: '2013', texto: 'Título revalidado no ano seguinte' },
  { ano: '2018', texto: 'Terceira vez consecutiva com o título' },
  { ano: '2019', texto: 'Quarta confirmação — consolidada como referência regional' },
]

const INFRA = ['Hospital Universitário', 'Museu de Ciência e Tecnologia', 'Parque Tecnológico', 'Centro de Eventos', 'Centro Esportivo e estádio próprio']

export default function PucrsPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        Um campus único, do tamanho de uma cidade pequena
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-10 max-w-2xl">
        Fundada em 1948 em Porto Alegre, a PUCRS foi a primeira universidade dos Irmãos Maristas no mundo. Hoje reúne
        cerca de 35 mil estudantes e já formou mais de 170 mil profissionais — tudo concentrado num único campus
        central que funciona quase como uma cidade universitária autossuficiente.
      </p>

      <CampusImage
        variant="float-right"
        src="https://upload.wikimedia.org/wikipedia/commons/c/cf/Pr%C3%A9dio_12_PUCRS.JPG"
        alt="Prédio 12 do campus central da PUCRS em Porto Alegre, um dos edifícios acadêmicos principais"
        caption="Prédio 12, campus central da PUCRS"
        credit="Foto: Rodelam / Wikimedia Commons, CC BY-SA 3.0"
      />

      {/* Linha do tempo horizontal de reconhecimentos — diferente das listas/tabelas usadas nas outras páginas */}
      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-4">
          Melhor universidade privada do Sul — quatro vezes seguidas
        </h3>
        <div className="relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-[#E2E8F0] dark:bg-[#1e2d4a]" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
            {PREMIOS.map(p => (
              <div key={p.ano} className="flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-[#4f46e5] dark:bg-[#712ae2] text-white text-xs font-bold flex items-center justify-center mb-3 z-10">
                  {p.ano.slice(2)}
                </div>
                <div className="text-xs text-[#475569] dark:text-[#94a3b8] leading-relaxed">{p.texto}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Infraestrutura como "amenidades de campus", formato de crachá/badge em vez de tags de curso */}
      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-3">
          O que cabe dentro do campus
        </h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {INFRA.map(i => (
            <div key={i} className="flex items-center gap-2 text-sm text-[#475569] dark:text-[#94a3b8] bg-[#F4F6F9] dark:bg-[#1a2542] rounded-lg px-3 py-2">
              <span className="text-[#712ae2] dark:text-[#818CF8]">✓</span>{i}
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8]">
        São mais de 50 opções de graduação, com forte tradição em <strong>Medicina</strong>, <strong>Engenharia Civil</strong>,{' '}
        <strong>Direito</strong> e <strong>Psicologia</strong>. O ingresso acontece por dois vestibulares próprios ao
        longo do ano (Verão e Inverno) ou pela nota do ENEM — datas e formato exato mudam a cada edição, confirme em{' '}
        <a href="https://vestibular.pucrs.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
          vestibular.pucrs.br
        </a>.
      </p>
    </div>
  )

  return <UniversityBasePage slug="pucrs" customContent={customContent} />
}
