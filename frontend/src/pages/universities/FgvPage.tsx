import UniversityBasePage from './UniversityBasePage'

const STATS = [
  { value: '1944', label: 'Ano de fundação' },
  { value: '5', label: 'Nota máxima no IGC/MEC (várias escolas)' },
  { value: '3º', label: 'Melhor think tank do mundo (Global Go To Think Tanks Index)' },
  { value: '2', label: 'Cidades-sede: São Paulo e Rio de Janeiro' },
]

const SCHOOLS = [
  { sigla: 'EAESP', nome: 'Escola de Administração de Empresas de São Paulo', cidade: 'São Paulo', curso: 'Administração', desde: '1954' },
  { sigla: 'FGV Direito SP', nome: 'Escola de Direito de São Paulo', cidade: 'São Paulo', curso: 'Direito', desde: '2002' },
  { sigla: 'EESP', nome: 'Escola de Economia de São Paulo', cidade: 'São Paulo', curso: 'Ciências Econômicas', desde: '2003' },
  { sigla: 'FGV Direito Rio', nome: 'Escola de Direito do Rio de Janeiro', cidade: 'Rio de Janeiro', curso: 'Direito', desde: '2002' },
]

const STEPS = [
  {
    title: 'Escolha a via de ingresso',
    text: 'Vestibular próprio da FGV, nota do ENEM (qualquer edição) ou, em alguns casos, olimpíadas do conhecimento/exames internacionais — cada modalidade tem prazo e taxa próprios.',
  },
  {
    title: 'Prova objetiva e discursiva',
    text: 'No vestibular próprio, todos os candidatos fazem uma prova com questões objetivas e discursivas, aplicada num sábado.',
  },
  {
    title: 'Segunda fase para Direito e Economia',
    text: 'Quem concorre a Direito (SP ou Rio) ou Economia (EESP) tem uma etapa adicional no domingo seguinte, incluindo exame oral para Direito.',
  },
  {
    title: 'Gabarito e resultado',
    text: 'O gabarito da prova objetiva sai poucos dias depois da aplicação; a lista de aprovados é divulgada semanas mais tarde, junto com a convocação para matrícula.',
  },
]

export default function FgvPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      {/* Tira de estatísticas — sem banner gradiente, foge do padrão das outras páginas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#E2E8F0] dark:bg-[#464554] rounded-2xl overflow-hidden mb-10 border border-[#E2E8F0] dark:border-[#464554]">
        {STATS.map(s => (
          <div key={s.label} className="bg-white dark:bg-[#191b23] p-4 sm:p-5 text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#4f46e5] dark:text-[#818CF8]">{s.value}</div>
            <div className="text-[11px] text-[#64748B] dark:text-[#c7c4d7] mt-1 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#c7c4d7] mb-10">
        A FGV (Fundação Getulio Vargas) nasceu em 1944 como centro de formação de quadros técnicos para a administração
        pública brasileira e, ao longo de oito décadas, se tornou uma das instituições de ensino e pesquisa mais
        respeitadas do país — reconhecida internacionalmente como think tank e com escolas de graduação de altíssimo
        prestígio em Administração, Direito e Economia.
      </p>

      {/* Tabela comparativa das escolas — em vez do bloco de "cursos em tags" usado nas outras páginas */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-4">As escolas de graduação da FGV</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] dark:border-[#464554]">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F6F9] dark:bg-[#1d1f27] text-[#4f46e5] dark:text-[#818CF8]">
                <th className="p-3 font-bold">Escola</th>
                <th className="p-3 font-bold">Curso</th>
                <th className="p-3 font-bold">Cidade</th>
                <th className="p-3 font-bold">Desde</th>
              </tr>
            </thead>
            <tbody>
              {SCHOOLS.map((s, i) => (
                <tr key={s.sigla} className={i % 2 === 0 ? 'bg-white dark:bg-[#191b23]' : 'bg-[#fbfcff] dark:bg-[#121b35]'}>
                  <td className="p-3 font-semibold text-[#1E293B] dark:text-white">{s.sigla}</td>
                  <td className="p-3 text-[#475569] dark:text-[#e1e2ec]">{s.curso}</td>
                  <td className="p-3 text-[#475569] dark:text-[#e1e2ec]">{s.cidade}</td>
                  <td className="p-3 text-[#475569] dark:text-[#e1e2ec]">{s.desde}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#a0a3af] dark:text-[#908fa0] mt-2">
          {SCHOOLS[0].nome} foi a primeira, criada em parceria com a Michigan State University. Direito SP, Direito Rio
          e EESP vieram na década seguinte, ampliando a atuação da fundação além da administração pública e de empresas.
        </p>
      </div>

      {/* Reconhecimento internacional — parágrafo adicional de aprofundamento */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-4">Reconhecimento internacional</h2>
        <p className="text-sm leading-relaxed text-[#475569] dark:text-[#c7c4d7]">
          Além da tradição doméstica, a FGV tem presença rara entre instituições brasileiras em rankings
          internacionais de peso: o <strong>OneMBA</strong>, MBA executivo oferecido pela FGV EAESP em parceria com
          escolas de negócios do México, Holanda, EUA e China, foi eleito o melhor MBA executivo da América Latina
          pelo Financial Times e aparece entre os 85 melhores do mundo — o único programa brasileiro na lista. A
          escola também aparece na 12ª posição mundial em Open Programs no mesmo ranking, reforçando sua tradição
          como uma das principais escolas de negócios da América Latina, não só do Brasil.
        </p>
      </div>

      {/* Linha do tempo vertical do processo seletivo — estrutura diferente do formato de cards das outras páginas */}
      <div>
        <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-6">Como funciona o processo seletivo</h2>
        <ol className="relative border-l-2 border-[#E2E8F0] dark:border-[#464554] ml-3 space-y-8">
          {STEPS.map((step, i) => (
            <li key={step.title} className="ml-6">
              <span className="absolute -left-[15px] flex items-center justify-center w-7 h-7 rounded-full bg-[#4f46e5] dark:bg-[#712ae2] text-white text-xs font-bold ring-4 ring-[#F4F6F9] dark:ring-[#10131a]">
                {i + 1}
              </span>
              <h3 className="font-bold text-[#1E293B] dark:text-white mb-1">{step.title}</h3>
              <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="text-xs text-[#a0a3af] dark:text-[#908fa0] mt-6 ml-6">
          Datas, taxas e formato exato mudam a cada edição — confirme sempre no edital vigente em{' '}
          <a href="https://vestibular.fgv.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            vestibular.fgv.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="fgv" customContent={customContent} />
}
