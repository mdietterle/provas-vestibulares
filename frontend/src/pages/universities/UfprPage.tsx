import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function UfprPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <div className="rounded-2xl border-l-4 border-slate-500 dark:border-slate-400 bg-slate-50 dark:bg-slate-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: a universidade mais antiga do Brasil em funcionamento contínuo
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          Fundada em 19 de dezembro de 1912, a UFPR é considerada a mais antiga instituição brasileira concebida
          como universidade e em funcionamento ininterrupto desde então — mais de um século de história acadêmica
          sem paralelo entre as federais do país.
        </p>
      </div>

      <CampusImage
        variant="diagonal-strip"
        src="https://upload.wikimedia.org/wikipedia/commons/e/e8/Universidade_Federal_do_Parana_1_Curitiba_Parana.jpg"
        alt="Prédio histórico da Universidade Federal do Paraná, em Curitiba"
        caption="Prédio histórico da UFPR, Curitiba"
        credit="Foto: Morio / Wikimedia Commons, CC BY-SA 3.0"
      />

      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Pública federal — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">UFPR: do centro histórico de Curitiba ao litoral paranaense</h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8 max-w-2xl">
        Além dos campi espalhados por Curitiba, a UFPR tem uma presença geográfica pouco comum: dois campi no
        litoral do estado — o Centro de Estudos do Mar, em Pontal do Paraná, e outro em Matinhos — somados a
        unidades em cidades do interior como Palotina e Toledo. É uma das poucas federais brasileiras com estrutura
        acadêmica dedicada especificamente a estudos costeiros e marinhos.
      </p>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8">
        São mais de 100 cursos de graduação entre licenciaturas, bacharelados e tecnólogos, além de mestrados,
        doutorados, residências médicas e cursos técnicos. No Ranking Universitário Folha (RUF) 2024, a UFPR ocupa
        o <strong>9º lugar entre as melhores universidades do Brasil</strong>. Cursos historicamente fortes incluem{' '}
        <strong>Medicina</strong>, <strong>Direito</strong>, <strong>Engenharias</strong> e{' '}
        <strong>Odontologia</strong>.
      </p>

      <div className="border-t border-[#E2E8F0] dark:border-[#464554] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Ingresso: vestibular próprio ou SiSU
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          O ingresso combina o <strong>vestibular próprio</strong>, conduzido pelo Núcleo de Concursos (NC-UFPR), e
          vagas via <strong>SiSU</strong> (ENEM). O NC-UFPR também organiza modalidades específicas, como Letras
          Libras e cotas para candidatos indígenas. Datas e vagas mudam a cada edital — confirme sempre em{' '}
          <a href="https://servicos.nc.ufpr.br/PortalNC/Home" target="_blank" rel="noreferrer" className="underline font-semibold">
            nc.ufpr.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufpr" customContent={customContent} />
}
