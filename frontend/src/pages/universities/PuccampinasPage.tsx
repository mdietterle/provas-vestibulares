import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function PuccampinasPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        A melhor universidade privada do interior do Brasil
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8 max-w-2xl">
        Sediada em Campinas (SP), a PUC-Campinas ocupa uma posição rara: segundo o ranking QS América Latina e Caribe,
        é a melhor universidade privada do interior brasileiro entre as que não estão sediadas em capitais — um
        território disputado por dezenas de instituições regionais.
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Pucc_II_2.jpg"
        alt="Campus da PUC-Campinas, com prédios acadêmicos e área de circulação entre estudantes"
        caption="Campus da PUC-Campinas"
        credit="Foto: Josedorival / Wikimedia Commons, domínio público"
      />

      {/* Card único de "curso em destaque" (spotlight) — formato bem diferente das listas/tags das outras páginas */}
      <div className="mb-10 rounded-3xl bg-gradient-to-r from-[#fef3e2] to-[#fff8ed] dark:from-[#2a2013] dark:to-[#1f1a10] border border-[#f0d9a8] dark:border-[#3d3220] p-6 sm:p-8">
        <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#92660f] dark:text-[#e8c068] bg-white/60 dark:bg-black/20 px-3 py-1 rounded-full mb-3">
          Curso em destaque
        </span>
        <h3 className="text-xl font-bold text-[#1E293B] dark:text-white mb-2">Tecnologia em Gastronomia</h3>
        <p className="text-sm text-[#475569] dark:text-[#cbd5e1] leading-relaxed">
          O Polo Gastronômico do Campus I reúne o curso de Tecnologia em Gastronomia com mentoria de chefs
          professores renomados — um diferencial raro entre universidades do interior paulista, que coloca a
          PUC-Campinas no mapa também fora das áreas tradicionais de Direito e Engenharia.
        </p>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8">
        Além da Gastronomia, a instituição oferece cerca de <strong>70 cursos de graduação</strong>, com tradição
        consolidada em <strong>Medicina</strong>, <strong>Arquitetura e Urbanismo</strong>, <strong>Direito</strong> e{' '}
        <strong>Psicologia</strong> — e ofertou 6.810 vagas na edição mais recente do vestibular.
      </p>

      {/* Barra de progresso simbólica mostrando as janelas de ingresso no ano, formato distinto */}
      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-3">Duas janelas de ingresso por ano</h3>
        <div className="flex rounded-full overflow-hidden h-8 text-xs font-bold text-white">
          <div className="flex-1 bg-[#2563EB] dark:bg-[#6366F1] flex items-center justify-center">Vestibular de Verão</div>
          <div className="flex-1 bg-[#6366F1] dark:bg-[#8b5cf6] flex items-center justify-center">Vestibular de Inverno</div>
        </div>
        <p className="text-xs text-[#a0a3af] dark:text-[#6b7385] mt-2">
          Além das duas edições próprias, a PUC-Campinas aceita nota do ENEM das três últimas edições, transferência
          externa e ingresso por diploma — inscrição sempre feita online, no site do vestibular.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">
          Avaliação MEC: seis cursos nota máxima e liderança em tecnologia
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A PUC-Campinas já dobrou o número de cursos <strong>cinco estrelas</strong> em avaliações recentes do MEC,
          entre eles Arquitetura e Urbanismo, Direito, Engenharia de Software, Letras, Pedagogia e Psicologia —
          resultado que colocou a instituição entre as <strong>4 melhores universidades privadas do Brasil</strong>.
          Engenharia de Software e Sistemas de Informação também tiraram nota máxima em avaliações in loco, e a
          Faculdade de Análise de Sistemas está completando 50 anos ininterruptos de funcionamento — uma das mais
          antigas do país na área.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">
          Papel no desenvolvimento tecnológico da região de Campinas
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          Campinas é um dos principais polos de tecnologia do Brasil, e a PUC-Campinas contribui diretamente pra
          isso há cinco décadas formando profissionais de software pra Região Metropolitana — uma área que reúne
          empresas de tecnologia, parques industriais e centros de pesquisa. A recente criação do curso de Ciência
          de Dados e Inteligência Artificial reforça essa vocação, atualizando a tradição da universidade em
          computação pras demandas mais recentes do mercado de trabalho regional.
        </p>
      </div>

      <p className="text-xs text-[#a0a3af] dark:text-[#6b7385]">
        Datas, vagas e requisitos mudam a cada edição — confirme sempre em{' '}
        <a href="https://vestibular.puc-campinas.edu.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
          vestibular.puc-campinas.edu.br
        </a>.
      </p>
    </div>
  )

  return <UniversityBasePage slug="puccampinas" customContent={customContent} />
}
