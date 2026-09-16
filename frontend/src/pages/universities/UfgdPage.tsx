import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const NOTA5 = ['História', 'Biologia', 'Licenciatura Intercultural Indígena Teko Arandu', 'Pedagogia', 'Licenciatura em Educação do Campo', 'Geografia']

export default function UfgdPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade pública federal
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        UFGD: 15 anos seguidos como a melhor universidade de Mato Grosso do Sul
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-4 max-w-2xl">
        A Universidade Federal da Grande Dourados nasceu em 2005, a partir do desmembramento da antiga UFMS, com
        sede em Dourados (MS). Apesar de relativamente jovem, se consolidou rápido: desde 2009, mantém os melhores
        índices de qualidade do estado, sendo considerada a melhor universidade de Mato Grosso do Sul por 15 anos
        consecutivos no Índice Geral de Cursos (IGC) do MEC.
      </p>

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: nota máxima no recredenciamento junto ao INEP/MEC
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          Em avaliação recente de recredenciamento, a UFGD recebeu conceito máximo do INEP/MEC — processo que
          reavalia a instituição como um todo, não só cursos isolados. Na última rodada de avaliação por curso, 7
          das 14 áreas avaliadas em 2024 tiraram nota 5 (máxima) e outras 6 tiraram nota 4, sinal de consistência
          entre diferentes áreas do conhecimento, não só num ou outro curso-vitrine.
        </p>
      </div>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/8/81/UFGD_%2850625986397%29.jpg"
        alt="Prédio do campus da Universidade Federal da Grande Dourados (UFGD), em Dourados, Mato Grosso do Sul"
        caption="Campus da UFGD, Dourados (MS)"
        credit="Foto: Ministério da Ciência, Tecnologia e Inovações / Wikimedia Commons, CC BY 2.0"
      />

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">
          Avaliação MEC por curso (nota máxima em 2024)
        </h3>
        <div className="flex flex-wrap gap-2">
          {NOTA5.map(c => (
            <span key={c} className="text-xs font-semibold text-[#2563EB] dark:text-[#818CF8] bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e] rounded-full px-3 py-1">
              {c} — nota 5
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8">
        Entre os cursos mais concorridos estão <strong>Direito</strong>, <strong>Medicina</strong>,{' '}
        <strong>Agronomia</strong>, <strong>Administração</strong> e <strong>Ciências Contábeis</strong> — perfil
        que reflete tanto a vocação agroindustrial da região (fronteira com o Paraguai, forte presença do
        agronegócio) quanto a demanda por profissionais de saúde e humanas na área de Dourados.
      </p>

      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">
          Inovação e extensão: da sala de aula ao empreendedorismo local
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A UFGD atua como Instituto de Ciência, Tecnologia e Inovação (ICTI) e mantém três incubadoras próprias: a{' '}
          <strong>GDTEC</strong> (incubadora tecnológica), a <strong>ITESS</strong> (tecnologias sociais e
          solidárias) e a <strong>EKOÁ</strong> (incubadora de coletivos e cultura). Tem posição estratégica no
          Ecossistema de Inovação de Dourados e no Tereré Hub, e nove dos 28 empreendimentos aprovados no programa
          estadual Centelha MS têm vínculo direto com a universidade — projetos de alunos, professores e ex-alunos
          incubados na GDTec. Extensão e pesquisa aplicada caminham lado a lado com o ensino, levando conhecimento
          da universidade direto pro tecido produtivo e social da região.
        </p>
      </div>

      <CampusImage
        variant="polaroid-tilt"
        src="https://upload.wikimedia.org/wikipedia/commons/c/c9/Biblioteca_central_UFGD.JPG"
        alt="Biblioteca Central da UFGD, espaço de estudo e acervo bibliográfico do campus em Dourados"
        caption="Biblioteca Central da UFGD"
        credit="Foto: Gustavo Siqueira / Wikimedia Commons, CC BY-SA 3.0"
      />

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-3">
          Como entrar: PSV (vestibular próprio) ou SiSU
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed mb-4">
          O ingresso é feito por duas vias independentes: o <strong>PSV</strong> (Processo Seletivo Vestibular)
          próprio da UFGD, ou o <strong>SiSU</strong> com nota do ENEM. O PSV é aplicado em fase única, num único
          dia, com 60 questões objetivas e uma redação.
        </p>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Inscrições</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Até início de setembro (taxa ~R$ 120)</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Prova (fase única)</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Meados de outubro, 60 questões + redação</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Resultado final</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Meados de janeiro do ano seguinte</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Vagas</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Cerca de 1.047 por edição, entre PSV e SiSU</dd>
          </div>
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#6b7385] mt-3">
          Isenção de taxa disponível mediante comprovação de baixa renda. Datas mudam a cada edital — confirme
          sempre em{' '}
          <a href="https://portal.ufgd.edu.br/vestibular" target="_blank" rel="noreferrer" className="underline font-semibold">
            portal.ufgd.edu.br/vestibular
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufgd" customContent={customContent} />
}
