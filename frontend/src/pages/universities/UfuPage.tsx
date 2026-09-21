import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function UfuPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">UFU: três campi, uma só cidade</h2>
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Pública federal — sem mensalidade
      </div>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#c7c4d7] mb-8 max-w-2xl">
        Fundada em 1969, a Universidade Federal de Uberlândia concentra seus três campi — Santa Mônica, Umuarama e
        Glória — todos dentro da própria Uberlândia (MG), diferente da maioria das federais mineiras, que costumam
        espalhar campi por várias cidades.
      </p>

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: multicampi compacto, tudo numa cidade só
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
          Enquanto universidades como UFJF ou UFMS espalham campi por cidades distantes entre si, a UFU concentra
          sua estrutura multicampi <strong>inteiramente dentro de Uberlândia</strong> — o que facilita intercâmbio
          entre unidades, rotina compartilhada entre estudantes de cursos diferentes e um senso de comunidade
          acadêmica único entre federais desse porte.
        </p>
      </div>

      <CampusImage
        variant="float-right"
        src="https://upload.wikimedia.org/wikipedia/commons/d/d9/CampiUFU.jpg"
        alt="Vista dos campi da Universidade Federal de Uberlândia"
        caption="Campi da UFU, Uberlândia"
        credit="Foto: Lkcalabria / Wikimedia Commons, CC BY-SA 3.0"
      />

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#c7c4d7] mb-8">
        São 67 cursos de bacharelado e 26 de licenciatura, com nota 4 (numa escala até 5) no Índice Geral de Cursos
        do MEC — considerado índice de excelência. Cursos de maior destaque incluem <strong>Medicina</strong>,{' '}
        <strong>Direito</strong> e <strong>Engenharia Civil</strong>, todos com notas altas do MEC.
      </p>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Avaliação MEC: única do Triângulo Mineiro com nota máxima em Medicina
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
          O curso de Medicina da UFU tirou nota máxima (5) no Enamed 2025, sendo a <strong>única instituição do
          Triângulo Mineiro</strong> a alcançar esse resultado entre as 49 do país que atingiram nota máxima.
          Jornalismo e Psicologia também são cursos <strong>cinco estrelas</strong> desde o Enade 2022, e Direito
          e Administração se destacaram nas avaliações mais recentes — um conjunto que mistura saúde, humanas e
          negócios, não só engenharia como em outras federais tecnológicas.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Papel no desenvolvimento do Triângulo Mineiro
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
          A UFU é o principal centro de ciência e tecnologia de uma região ampla que vai muito além de Uberlândia:
          cobre o Triângulo Mineiro, o Alto Paranaíba, o noroeste e norte de Minas Gerais, o sul e sudoeste de
          Goiás, o norte de São Paulo e partes de Mato Grosso e Mato Grosso do Sul. Formar médicos, engenheiros e
          administradores de nota máxima nessa posição geográfica central ajuda a fixar profissionais qualificados
          numa área que, de outra forma, dependeria de grandes capitais distantes como Belo Horizonte ou Brasília.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#464554] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Ingresso: SiSU principal, próprio pra remanescentes
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
          O ingresso principal é via <strong>SiSU</strong> (ENEM), com um ciclo anual conduzido pelo MEC. A UFU
          também realiza processos próprios (objetiva + redação) tipicamente pro 2º semestre ou pra vagas
          remanescentes. Confirme sempre em{' '}
          <a href="https://www.portalselecao.ufu.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            portalselecao.ufu.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufu" customContent={customContent} />
}
