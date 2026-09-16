import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const CAMPI = ['Maringá (sede)', 'Umuarama', 'Cianorte', 'Goioerê', 'Diamante do Norte', 'Ivaiporã', 'Cidade Gaúcha']

export default function UemPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade pública estadual — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        UEM: referência regional no noroeste do Paraná
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8 max-w-2xl">
        A Universidade Estadual de Maringá tem sede em Maringá — a 3ª maior cidade do Paraná e polo regional de
        saúde, indústria e agronegócio — e é mantida pelo governo do estado, vinculada à Secretaria de Estado da
        Ciência, Tecnologia e Ensino Superior (SETI). Fundada em 1970, a UEM se consolidou como uma das principais
        referências em ensino, pesquisa e extensão do Paraná, com forte presença em produção científica: são mais de
        10 mil artigos indexados nas principais bases internacionais (Web of Science e Scopus).
      </p>

      <CampusImage
        variant="float-right"
        src="https://upload.wikimedia.org/wikipedia/commons/5/54/Bloco_A_34_da_Universidade_Estadual_de_Maring%C3%A1_%28UEM%29.jpg"
        alt="Bloco A34, prédio acadêmico do campus sede da Universidade Estadual de Maringá"
        caption="Bloco A34, campus sede da UEM em Maringá"
        credit="Foto: Charherjun / Wikimedia Commons, CC BY-SA 4.0"
      />

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8">
        Além da sede, a UEM tem uma estrutura multicampi que leva o ensino público a seis outras cidades da região:
      </p>
      <div className="flex flex-wrap gap-2 mb-10">
        {CAMPI.map(c => (
          <span key={c} className="text-sm font-semibold text-[#2563EB] dark:text-[#818CF8] border-2 border-dashed border-[#c5c5d3] dark:border-[#334155] rounded-lg px-3 py-1.5">
            {c}
          </span>
        ))}
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8">
        São mais de 65 cursos de graduação e cerca de 21 mil estudantes entre graduação e pós-graduação. A UEM tem
        avaliação de excelência (nota 5, máxima do MEC) em <strong>Engenharia Civil</strong>, e também é referência
        em <strong>Medicina</strong>, <strong>Odontologia</strong> e <strong>Farmácia</strong>. Um diferencial
        importante: a universidade mantém o Hospital Universitário Regional de Maringá (HUM), integrado ao SUS, que
        funciona como campo prático de formação para os cursos de saúde.
      </p>

      <CampusImage
        variant="diagonal-strip"
        src="https://upload.wikimedia.org/wikipedia/commons/e/ef/Museu_Din%C3%A2mico_Interdisciplinar_de_Maring%C3%A1_01.jpg"
        alt="Museu Dinâmico Interdisciplinar de Maringá, espaço de divulgação científica ligado à UEM"
        caption="Museu Dinâmico Interdisciplinar de Maringá (MUDI/UEM)"
        credit="Foto: Simplus Menegati / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">
          Vestibular: duas janelas de inscrição por ano
        </h3>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-3">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Vestibular de Inverno</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Inscrições entre abril e maio, ingresso no ano letivo seguinte</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Vestibular de Verão</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Inscrições entre agosto e setembro</dd>
          </div>
        </dl>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          O processo é organizado pela CVU (Comissão do Vestibular Unificado), além de vagas via SiSU/ENEM e PAS
          (Programa de Avaliação Seriada). Datas exatas mudam a cada edital — confirme sempre em{' '}
          <a href="https://www.cvu.uem.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            cvu.uem.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="uem" customContent={customContent} />
}
