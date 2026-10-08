import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const CAMPI = ['Manaus (sede)', 'Benjamin Constant', 'Coari', 'Humaitá', 'Itacoatiara', 'Parintins']

export default function UfamPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade pública federal — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        UFAM: o maior campus universitário verde do Brasil
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-4 max-w-2xl">
        A Universidade Federal do Amazonas tem sede no bairro Coroado, na zona leste de Manaus, e é a principal
        instituição federal de ensino superior do estado, com papel estratégico na formação de profissionais pra
        toda a região amazônica.
      </p>

      {/* Destaque diferenciador, isolado logo no topo */}
      <div className="rounded-2xl border-l-4 border-slate-500 dark:border-slate-400 bg-slate-50 dark:bg-slate-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial único: 6,7 milhões de m² de área verde dentro do campus
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          O campus da UFAM em Manaus é o <strong>terceiro maior fragmento de mata em área urbana do mundo</strong> —
          e o primeiro do Brasil. Nenhuma outra universidade citada nesta plataforma tem algo parecido: é uma
          universidade que preserva uma extensão de floresta amazônica praticamente intacta dentro do próprio
          terreno acadêmico, algo raro mesmo em escala mundial.
        </p>
      </div>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/7/71/Centro_de_Artes_da_Universidade_Federal_do_Amazonas_%28CAUA%29_01.jpg"
        alt="Centro de Artes da Universidade Federal do Amazonas (CAUA), prédio acadêmico do campus em Manaus"
        caption="Centro de Artes da UFAM (CAUA), campus Manaus"
        credit="Foto: Ajmcbarreto / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Seis campi pela Amazônia</h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed mb-3">
          Além da sede, a UFAM tem unidades acadêmicas espalhadas pelo interior do estado, levando ensino federal
          pra municípios distantes da capital:
        </p>
        <div className="flex flex-wrap gap-2">
          {CAMPI.map(c => (
            <span key={c} className="text-sm font-semibold text-slate-600 dark:text-slate-400 border-2 border-dashed border-[#c5c5d3] dark:border-slate-300 rounded-lg px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8">
        São 119 cursos de graduação presenciais entre capital e interior, além de 31 mestrados e 8 doutorados.
        Cursos mais concorridos incluem <strong>Medicina</strong>, <strong>Direito</strong>,{' '}
        <strong>Engenharia</strong>, <strong>Odontologia</strong> e <strong>Enfermagem</strong>. O corpo docente tem
        42% de doutores e quase 38% de mestres, e a instituição recebeu nota 4 (na escala máxima de 5) em
        indicadores de qualidade do MEC.
      </p>

      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Pesquisa, extensão e estrutura pra comunidade
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          A UFAM mantém 1.455 projetos e atividades de extensão em curso, aproximando a produção acadêmica das
          demandas da população amazonense. Entre os órgãos suplementares estão a Biblioteca Central, o Museu
          Amazônico (acervo etnográfico e cultural da região), o Centro de Ciências do Ambiente, uma Fazenda
          Experimental e a Editora da UFAM — uma estrutura que mistura ensino, pesquisa aplicada e serviço direto à
          comunidade, com forte cooperação internacional em intercâmbio de estudantes.
        </p>
      </div>

      <CampusImage
        variant="diagonal-strip"
        src="https://upload.wikimedia.org/wikipedia/commons/b/b6/Museu_Amaz%C3%B4nico_da_UFAM_-_1.jpg"
        alt="Museu Amazônico da UFAM, espaço de acervo etnográfico e cultural sobre a região amazônica"
        caption="Museu Amazônico da UFAM"
        credit="Foto: Ajmcbarreto / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="border-t border-[#E2E8F0] dark:border-[#464554] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Como entrar: PSC ou SiSU, metade das vagas pra cada
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed mb-4">
          Metade das vagas de cada curso vai pro <strong>PSC (Processo Seletivo Contínuo)</strong>, um vestibular
          seriado próprio dividido em três etapas ao longo do ensino médio (uma prova ao final de cada série). A
          outra metade é preenchida via <strong>SiSU</strong>, com a nota do ENEM.
        </p>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <dt className="font-bold text-slate-600 dark:text-slate-400">Isenção da taxa</dt>
            <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Fim de agosto a início de setembro, pra quem está no CadÚnico</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <dt className="font-bold text-slate-600 dark:text-slate-400">Inscrições PSC</dt>
            <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Meados de setembro a início de outubro (taxa ~R$ 105)</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <dt className="font-bold text-slate-600 dark:text-slate-400">Prova das 3 etapas</dt>
            <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Fim de novembro, aplicada em ~22 municípios do Amazonas</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <dt className="font-bold text-slate-600 dark:text-slate-400">SiSU</dt>
            <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Segue o calendário nacional do MEC</dd>
          </div>
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#908fa0] mt-3">
          Provas aplicadas em dezenas de municípios facilita o acesso de quem mora no interior do estado — um
          detalhe importante numa região com distâncias tão grandes até a capital. Datas mudam a cada edital —
          confirme sempre em{' '}
          <a href="https://www.ufam.edu.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            ufam.edu.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufam" customContent={customContent} />
}
