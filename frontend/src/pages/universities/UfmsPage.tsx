import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const CAMPI = ['Campo Grande (sede)', 'Aquidauana', 'Chapadão do Sul', 'Corumbá', 'Coxim', 'Naviraí', 'Nova Andradina', 'Paranaíba', 'Ponta Porã', 'Três Lagoas']

export default function UfmsPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade pública federal — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        UFMS: a maior instituição pública de Mato Grosso do Sul
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8 max-w-2xl">
        A Universidade Federal de Mato Grosso do Sul tem sede em Campo Grande e raízes que remontam a 1962, embora
        só tenha sido oficializada como universidade federal em 1979. Hoje é a maior instituição pública de ensino
        superior do estado, com estrutura multicampi que leva ensino federal pra praticamente todas as regiões de
        MS.
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/c/ce/Monumento_Universidade_Federal_Do_Mato_Grosso_Do_Sul.jpg"
        alt="Monumento na entrada do campus da Universidade Federal de Mato Grosso do Sul, em Campo Grande"
        caption="Entrada do campus da UFMS, Campo Grande"
        credit="Foto: Wiviane Xavier / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Nove campi pelo interior de MS</h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed mb-3">
          Além da sede em Campo Grande, a UFMS tem unidades em outras nove cidades do estado, cobrindo desde a
          fronteira com o Paraguai (Ponta Porã) até o Pantanal (Corumbá):
        </p>
        <div className="flex flex-wrap gap-2">
          {CAMPI.map(c => (
            <span key={c} className="text-sm font-semibold text-slate-600 dark:text-slate-400 border-2 border-dashed border-[#c5c5d3] dark:border-slate-300 rounded-lg px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border-l-4 border-slate-500 dark:border-slate-400 bg-slate-50 dark:bg-slate-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: ciência com endereço no Pantanal
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          Com o campus de Corumbá dentro do próprio bioma, a UFMS tem atuação forte e diferenciada em pesquisa e
          preservação ambiental ligada diretamente ao <strong>Pantanal</strong> — um dos biomas mais estudados e
          mais frágeis do planeta. Some a isso uma estrutura de mais de <strong>660 laboratórios, oficinas e
          espaços de ensino/pesquisa</strong> espalhados pelos campi, um volume raro entre universidades de porte
          médio no país.
        </p>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-10">
        São mais de 100 cursos de graduação em Ciências Exatas, Humanas, Biológicas, Engenharias, Saúde, Artes e
        Ciências Sociais Aplicadas — com destaque histórico em <strong>Medicina</strong>,{' '}
        <strong>Medicina Veterinária</strong>, <strong>Agronomia</strong>, <strong>Direito</strong> e{' '}
        <strong>Odontologia</strong>, refletindo tanto a vocação agropecuária do estado quanto a demanda regional
        por profissionais de saúde.
      </p>

      <CampusImage
        variant="polaroid-tilt"
        src="https://upload.wikimedia.org/wikipedia/commons/0/0d/Vista_lateral_e_dos_fundos_do_Hospital_Universit%C3%A1rio_Maria_Aparecida_Pedrossian%2C_UFMS%2C_dezembro_de_2022_%281%29.jpg"
        alt="Hospital Universitário Maria Aparecida Pedrossian, ligado à UFMS, em Campo Grande"
        caption="Hospital Universitário Maria Aparecida Pedrossian (UFMS)"
        credit="Foto: Fronteira / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Serviço direto à comunidade: hospital e extensão
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          A UFMS mantém o Hospital Universitário Maria Aparecida Pedrossian, referência em saúde de alta
          complexidade integrada ao SUS em Campo Grande, e uma agenda ativa de extensão universitária que conecta
          projetos de pesquisa e ensino diretamente com a comunidade — do apoio a pequenos produtores rurais até
          programas de saúde pública, ação constante em praticamente todos os campi do interior.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#464554] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Como entrar: Vestibular, PASSE ou SiSU
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed mb-4">
          A UFMS combina três vias principais: o <strong>Vestibular</strong> tradicional (prova objetiva anual), o{' '}
          <strong>PASSE</strong> (avaliação seriada em três etapas ao longo do ensino médio) e o <strong>SiSU</strong>{' '}
          com nota do ENEM. Se ainda sobrarem vagas depois das primeiras chamadas, existe ainda a modalidade
          complementar "Quero ser UFMS".
        </p>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <dt className="font-bold text-slate-600 dark:text-slate-400">Inscrições</dt>
            <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Fim de agosto a meados de novembro (taxa ~R$ 100)</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <dt className="font-bold text-slate-600 dark:text-slate-400">Prova do Vestibular</dt>
            <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Início de dezembro</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <dt className="font-bold text-slate-600 dark:text-slate-400">Provas do PASSE (3 etapas)</dt>
            <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Mesma semana do vestibular, em dezembro</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <dt className="font-bold text-slate-600 dark:text-slate-400">Vagas</dt>
            <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">~9.363 vagas em 131 cursos</dd>
          </div>
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#908fa0] mt-3">
          Datas mudam a cada edital — confirme sempre em{' '}
          <a href="https://ingresso.ufms.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            ingresso.ufms.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufms" customContent={customContent} />
}
