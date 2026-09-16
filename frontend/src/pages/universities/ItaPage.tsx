import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function ItaPage() {
  const customContent = (
    <div className="space-y-10 mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      {/* Banner Principal */}
      <div className="bg-gradient-to-br from-[#2563EB] via-[#1a3a8a] to-[#6366F1] text-white p-6 sm:p-10 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-yellow-300 bg-white/10 px-3 py-1 rounded-full mb-3">
            Tudo o que você precisa saber
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-white leading-tight">
            ITA: excelência em engenharia aeroespacial e um dos vestibulares mais difíceis do Brasil
          </h2>
          <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-2xl font-normal">
            Fundado em 1950 e inspirado no MIT americano, o ITA formou mais de 15 mil engenheiros e é referência
            nacional e internacional em ciência e tecnologia aeroespacial — com um vestibular à altura desse
            prestígio.
          </p>
        </div>
      </div>

      {/* Seção 1: Excelência */}
      <section className="bg-white dark:bg-[#151f38] border border-[#E2E8F0] dark:border-[#1e2d4a] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            Por que o ITA é referência
          </h2>
          <div className="text-sm text-[#475569] dark:text-[#94a3b8] mt-4 space-y-4 leading-relaxed">
            <CampusImage
              variant="polaroid-tilt"
              src="https://upload.wikimedia.org/wikipedia/commons/b/b1/Instituto_Tecnol%C3%B3gico_de_Aeron%C3%A1utica_%28ITA%29_main_street.JPG"
              alt="Rua principal do campus do ITA em São José dos Campos, com prédios acadêmicos alinhados entre árvores"
              caption="Campus do ITA, São José dos Campos"
              credit="Foto: Bento Mattos / Wikimedia Commons, domínio público"
            />
            <p>
              O ITA foi criado por iniciativa do Marechal Casimiro Montenegro Filho, com o modelo do MIT (Massachusetts
              Institute of Technology) como inspiração declarada: formar engenheiros de altíssimo nível e um centro de
              pesquisa que levasse a ciência e tecnologia aeronáutica brasileira ao patamar internacional. Décadas
              depois, esse objetivo se cumpriu — o instituto é hoje um dos pilares da soberania tecnológica do país no
              setor aeroespacial e de defesa.
            </p>
            <p>
              Localizado em São José dos Campos (SP), o ITA fez parte do berço tecnológico que deu origem à Embraer,
              uma das maiores fabricantes de aeronaves do mundo, e segue formando profissionais que hoje atuam em
              posições estratégicas na indústria aeroespacial, de defesa e em empresas de tecnologia dentro e fora do
              Brasil.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm leading-relaxed">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
              Cursos de engenharia oferecidos
            </h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {['Engenharia Aeronáutica', 'Engenharia Aeroespacial', 'Engenharia Eletrônica', 'Engenharia Mecânica-Aeronáutica', 'Engenharia Civil-Aeronáutica', 'Engenharia de Computação'].map(c => (
                <span key={c} className="bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#334155] px-2.5 py-1 rounded-md font-semibold text-[#2563EB] dark:text-[#818CF8]">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Seção 2: Processo seletivo */}
      <section className="bg-white dark:bg-[#151f38] border border-[#E2E8F0] dark:border-[#1e2d4a] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            Como funciona o processo seletivo
          </h2>
          <div className="text-sm text-[#475569] dark:text-[#94a3b8] mt-4 space-y-4 leading-relaxed">
            <p>
              O vestibular do ITA é organizado em <strong>três etapas</strong>. As duas primeiras compõem o Exame
              Vestibular, com provas de conhecimentos: a primeira fase, objetiva, funciona como peneira inicial —
              quem não atinge a nota de corte não avança. Quem passa é convocado pra segunda fase, com provas
              discursivas mais aprofundadas por disciplina. A terceira etapa é a <strong>Inspeção de Saúde</strong>,
              obrigatória pra quem for convocado, já que o curso tem regime de dedicação exclusiva e, pra quem opta
              pela carreira militar, exigências físicas específicas.
            </p>
            <p>
              Além da nota das provas, o ITA reserva parte das vagas por meio de <strong>ações afirmativas</strong>:
              cotas para candidatos autodeclarados pretos ou pardos, indígenas e quilombolas, dentro do total de vagas
              oferecido a cada edição.
            </p>
          </div>
        </div>

        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">1ª fase (objetiva)</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Peneira eliminatória por nota de corte</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">2ª fase (discursiva)</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Prova mais aprofundada por disciplina, define classificação final</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">3ª etapa</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Inspeção de Saúde, obrigatória para convocados</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Vagas por cota</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Reservadas para pretos/pardos, indígenas e quilombolas</dd>
          </div>
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#6b7385]">
          Inscrições exclusivamente pela internet, no site oficial do processo seletivo. Datas e número de vagas mudam
          a cada edital — confirme sempre em{' '}
          <a href="https://www.vestibular.ita.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            vestibular.ita.br
          </a>.
        </p>
      </section>

      {/* Seção 3: Integração com a Aeronáutica */}
      <section className="bg-white dark:bg-[#151f38] border border-[#E2E8F0] dark:border-[#1e2d4a] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            Carreira militar ou civil: o aluno escolhe
          </h2>
          <div className="text-sm text-[#475569] dark:text-[#94a3b8] mt-4 space-y-4 leading-relaxed">
            <p>
              O ITA é uma instituição federal vinculada ao Comando da Aeronáutica, e essa ligação aparece desde o
              primeiro ano de curso: todos os ingressantes começam como alunos militares do CPOR (Centro de Preparação
              de Oficiais da Reserva), recebendo soldo e passando por uma etapa inicial em regime de internato de
              cerca de 30 dias, antes mesmo do início das aulas.
            </p>
            <p>
              Ao final do primeiro ano, o próprio aluno decide o caminho: seguir como <strong>civil</strong>, mantendo
              o mesmo curso de engenharia com liberdade pra atuar depois em qualquer empresa do setor (inclusive fora
              do Brasil), ou seguir como <strong>militar</strong>, seguindo carreira como Oficial da Aeronáutica. O
              regime de internato no alojamento estudantil (H8) é opcional, mas tradicionalmente muito comum entre os
              alunos, seja qual for a escolha de carreira.
            </p>
          </div>
        </div>

        <div className="bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e] rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-base text-[#2563EB] dark:text-[#818CF8]">
            Quem escolhe a Aeronáutica
          </h3>
          <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
            Quem opta pela carreira militar se forma como <strong>Primeiro Tenente Engenheiro</strong> e ingressa no
            Quadro de Oficiais Engenheiros da ativa da Força Aérea Brasileira, com compromisso mínimo de permanência
            de cinco anos na Aeronáutica. É um caminho direto entre a formação de excelência em engenharia e uma
            carreira estratégica de Estado, algo raro entre as universidades brasileiras.
          </p>
        </div>

        <CampusImage
          variant="corner-badge"
          src="https://upload.wikimedia.org/wikipedia/commons/1/16/Library-ITA.JPG"
          alt="Biblioteca do ITA, prédio projetado por Oscar Niemeyer, com estrutura modernista característica"
          caption="Biblioteca do ITA, projeto de Oscar Niemeyer"
          credit="Foto: Wikimedia Commons, CC BY-SA 3.0"
        />
      </section>
    </div>
  )

  return <UniversityBasePage slug="ita" customContent={customContent} />
}
