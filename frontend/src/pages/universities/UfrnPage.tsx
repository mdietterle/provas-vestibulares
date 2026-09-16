import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function UfrnPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">UFRN: referência potiguar, olhar internacional</h2>
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Pública federal — sem mensalidade
      </div>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8 max-w-2xl">
        Sediada em Natal, a UFRN coordena o maior grupo de projetos de pesquisa e de cursos de pós-graduação do Rio
        Grande do Norte, com presença em 2 campi na capital e 5 no interior do estado.
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/d/d3/Escola_de_M%C3%BAsica_da_UFRN%2C_Natal_%28RN%29.jpg"
        alt="Escola de Música da UFRN, em Natal"
        caption="Escola de Música da UFRN, Natal"
        credit="Foto: Marcos Elias de Oliveira Júnior / Wikimedia Commons, domínio público (CC0)"
      />

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: mais de 70 acordos com universidades estrangeiras
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A internacionalização é um princípio institucional declarado da UFRN, que mantém acordos de cooperação
          com <strong>mais de 70 universidades estrangeiras</strong>, enviando e recebendo estudantes do mundo
          inteiro — um volume de parcerias internacionais raro entre federais do Nordeste.
        </p>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8">
        São 78 cursos de graduação (7 a distância) e 82 cursos de pós-graduação stricto sensu (52 mestrados, 30
        doutorados), além de 21 estágios médicos. Cursos de destaque incluem <strong>Medicina</strong>,{' '}
        <strong>Direito</strong>, <strong>Odontologia</strong>, <strong>Engenharias</strong> e{' '}
        <strong>Psicologia</strong>.
      </p>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">
          Avaliação MEC: nota máxima em Medicina e 11 cursos com conceito 5
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          Os dois cursos de Medicina da UFRN (Natal e Caicó) tiraram <strong>nota máxima (5) no Enamed 2025</strong>,
          o exame nacional de formação médica — resultado que faz do Rio Grande do Norte um dos poucos estados com
          dois cursos de Medicina nota máxima na mesma instituição. No Enade 2019, a UFRN teve{' '}
          <strong>11 cursos com conceito 5</strong>: Fonoaudiologia, Nutrição, Educação Física, Enfermagem,
          Fisioterapia e Medicina na área de saúde, além de Engenharia Civil, Engenharia Elétrica, Engenharia de
          Produção e Arquitetura e Urbanismo — um espectro amplo que vai muito além da área médica.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">
          Papel no desenvolvimento do Rio Grande do Norte
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          Como principal universidade pública do estado, a UFRN concentra a maior parte da pesquisa e pós-graduação
          potiguar, com reflexo direto na formação de médicos, engenheiros e pesquisadores que sustentam setores
          estratégicos locais — de saúde pública a energia e petróleo, área historicamente relevante pro Rio Grande
          do Norte. A rede de acordos internacionais também atrai estudantes estrangeiros pra Natal, ampliando o
          alcance econômico e cultural da universidade além da própria região Nordeste.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">
          Ingresso: majoritariamente SiSU
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A maior parte das vagas é preenchida via <strong>SiSU</strong> (nota do ENEM), seguindo o calendário
          nacional do MEC. A <strong>COMPERVE</strong> organiza processos específicos e complementares — vagas
          remanescentes e cursos com acesso diferenciado — com datas próprias divulgadas por edital ao longo do
          ano. Confirme sempre em{' '}
          <a href="https://comperve.ufrn.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            comperve.ufrn.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufrn" customContent={customContent} />
}
