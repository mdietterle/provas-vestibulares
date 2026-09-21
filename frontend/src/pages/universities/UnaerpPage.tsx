import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const FAQ = [
  {
    p: 'Onde fica a UNAERP?',
    r: 'Dois campi: Ribeirão Preto (SP), a sede histórica, com 120 mil m², e Guarujá (SP), num terreno de 30 mil m² na Enseada, litoral paulista.',
  },
  {
    p: 'É pública ou privada?',
    r: 'Privada, sem fins lucrativos. Reconhecida como universidade em 1985, depois de nascer como escola de Farmácia e Odontologia.',
  },
  {
    p: 'Quais os cursos mais fortes?',
    r: 'Medicina é o mais concorrido, com destaque também pra Direito, Jornalismo, Publicidade e Propaganda, Design de Moda, Design Gráfico, Administração e Odontologia.',
  },
  {
    p: 'Como funciona a pesquisa e extensão?',
    r: 'Mais de 50 laboratórios de ensino, 250 projetos de pesquisa e 50 programas de extensão em andamento — um volume grande pra universidade de porte médio.',
  },
  {
    p: 'Como entrar?',
    r: 'Nota do ENEM (edições de 2010 a 2025, exceto pra Medicina), prova de redação, ou vestibular tradicional com 40 questões + redação (60 questões pra Medicina).',
  },
]

export default function UnaerpPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <figure className="float-left mr-6 mb-4 max-w-[45%] sm:max-w-xs">
        <blockquote className="text-xl sm:text-2xl font-display font-bold text-[#1E293B] dark:text-white leading-snug border-l-4 border-[#712ae2] pl-4">
          "Mais de 500 mil atendimentos por ano à comunidade."
        </blockquote>
        <figcaption className="text-xs text-[#a0a3af] dark:text-[#908fa0] pl-4 mt-2">
          Rede de Serviços Comunitários da UNAERP
        </figcaption>
      </figure>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#c7c4d7]">
        A UNAERP nasceu como a Sociedade Escola de Pharmácia e Odontologia de Ribeirão Preto, fundada por um grupo
        de profissionais de saúde, intelectuais e educadores. Virou universidade em 1985, mas já investia em
        produção científica desde o início dos anos 1980, com projetos em biotecnologia, meio ambiente, educação,
        cultura e gestão pública — antes mesmo de ter status de universidade.
      </p>

      <div className="clear-both" />

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 my-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: rede de serviço comunitário em escala rara pra uma universidade privada
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
          A <strong>Rede de Serviços Comunitários</strong> da UNAERP realiza mais de <strong>500 mil atendimentos
          por ano</strong> através de programas de extensão — um volume de serviço direto à população raramente
          visto em instituições privadas desse porte, geralmente mais focadas em ensino e pesquisa isolados da
          comunidade ao redor.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Avaliação MEC: 3ª melhor privada do país, com cinco cursos nota máxima
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
          A UNAERP é a <strong>3ª melhor universidade privada do Brasil</strong> segundo o IGC/MEC 2023 (8ª entre
          públicas e privadas), com nota 4 de excelência mantida por onze anos consecutivos (2012-2023). Cinco
          cursos tiraram <strong>nota máxima (5)</strong> na avaliação de 2023: Nutrição, Fisioterapia, Farmácia,
          Arquitetura e Urbanismo, e Engenharia de Produção. Jornalismo ficou em 1º lugar do estado de São Paulo
          no MEC, e Engenharia Civil é 1ª colocada em Ribeirão Preto entre públicas e privadas — sinal de que a
          força da instituição não se limita a Medicina, seu curso historicamente mais concorrido.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Papel no desenvolvimento de Ribeirão Preto
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
          Ribeirão Preto é polo agroindustrial e de saúde do interior paulista, e a UNAERP nasceu justamente ligada
          a essas vocações — uma escola de Farmácia e Odontologia que, décadas depois, virou universidade completa.
          A combinação de Medicina, Odontologia e Farmácia com Engenharia de Produção e Arquitetura reforça o papel
          da instituição na formação de mão de obra qualificada pro polo de agronegócio e saúde da região, além de
          sustentar boa parte da atividade econômica ligada a serviços educacionais e de saúde na cidade.
        </p>
      </div>

      {/* FAQ em acordeão nativo (details/summary) — mecanismo interativo ainda não usado nas outras páginas */}
      <div className="space-y-2 mb-8">
        {FAQ.map(f => (
          <details key={f.p} className="group rounded-xl border border-[#E2E8F0] dark:border-[#464554] bg-white dark:bg-[#191b23] p-4 open:shadow-sm">
            <summary className="cursor-pointer font-semibold text-[#1E293B] dark:text-white flex items-center justify-between list-none">
              {f.p}
              <span className="text-[#712ae2] dark:text-[#818CF8] group-open:rotate-45 transition-transform text-lg leading-none">+</span>
            </summary>
            <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed mt-3">{f.r}</p>
          </details>
        ))}
      </div>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/0/05/UNAERP_-_campus_Ribeir%C3%A3o_Preto.jpg"
        alt="Campus da UNAERP em Ribeirão Preto (SP)"
        caption="Campus da UNAERP, Ribeirão Preto"
        credit="Foto: Matheus Ribeiro de Souza / Wikimedia Commons, CC BY-SA 3.0"
      />

      <p className="text-xs text-[#a0a3af] dark:text-[#908fa0] mt-6">
        Datas, vagas e requisitos de ingresso mudam a cada edição — confirme sempre em{' '}
        <a href="https://unaerp.br/estude-na-unaerp/processo-seletivo/" target="_blank" rel="noreferrer" className="underline font-semibold">
          unaerp.br/processo-seletivo
        </a>.
      </p>
    </div>
  )

  return <UniversityBasePage slug="unaerp" customContent={customContent} />
}
