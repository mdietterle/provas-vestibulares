import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const CAMPI = ['Fortaleza — Benfica, Pici e Porangabuçu', 'Sobral', 'Quixadá', 'Crateús', 'Russas', 'Itapajé']

export default function UfcPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Pública federal — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">UFC: "o universal pelo regional"</h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8 max-w-2xl">
        A Universidade Federal do Ceará adota como lema "o universal pelo regional" — resumindo bem sua estratégia
        de atuar como pilar de desenvolvimento tanto do Ceará quanto do Nordeste. Tem três campi em Fortaleza
        (Benfica, Pici e Porangabuçu) e presença em cinco cidades do interior.
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/d/db/Portaria_UFC_campus_PICI.jpg"
        alt="Portaria do campus do Pici, Universidade Federal do Ceará, em Fortaleza"
        caption="Campus do Pici, UFC, Fortaleza"
        credit="Foto: Túllio F / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="rounded-2xl border-l-4 border-slate-500 dark:border-slate-400 bg-slate-50 dark:bg-slate-950/20 p-5 my-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Avaliação MEC: nota máxima por dois anos seguidos, 2ª melhor do Nordeste
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          A UFC conquistou <strong>nota máxima no Índice Geral de Cursos (IGC) do MEC por dois anos
          consecutivos</strong>, avançando do 32º pro 24º lugar no ranking nacional — e hoje é considerada a{' '}
          <strong>2ª melhor universidade do Nordeste</strong>, atrás só da UFRN e à frente da UFPE. No Enade 2022,
          9 cursos tiraram nota máxima (5): Direito (diurno e noturno), Ciências Contábeis (diurno e noturno),
          Administração (diurno e noturno), Jornalismo, Publicidade e Propaganda, e Psicologia (campus Sobral).
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Seis polos entre a capital e o interior cearense
        </h3>
        <div className="flex flex-wrap gap-2">
          {CAMPI.map(c => (
            <span key={c} className="text-sm font-semibold text-slate-600 dark:text-slate-400 border-2 border-dashed border-[#c5c5d3] dark:border-slate-300 rounded-lg px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8">
        São mais de 120 cursos de graduação (incluindo EaD) e 153 cursos de pós-graduação (82 mestrados, 51
        doutorados). O curso de <strong>Medicina em Fortaleza</strong> tirou nota máxima na primeira edição do
        Enamed, exame nacional de formação médica. Outros cursos de destaque: <strong>Direito</strong>,{' '}
        <strong>Administração</strong>, <strong>Ciências Contábeis</strong> e <strong>Jornalismo</strong>.
      </p>

      <CampusImage
        variant="polaroid-tilt"
        src="https://upload.wikimedia.org/wikipedia/commons/3/37/Universidade_Federal_do_Cear%C3%A1_-_Campus_de_Sobral.jpg"
        alt="Campus de Sobral da Universidade Federal do Ceará"
        caption="Campus de Sobral, UFC"
        credit="Foto: UFC Sobral / Wikimedia Commons, domínio público (CC0)"
      />

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Papel no desenvolvimento do Ceará e do Nordeste
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          A expansão pra Sobral, Quixadá, Crateús, Russas e Itapajé levou ensino federal gratuito e pesquisa
          aplicada pra regiões do interior cearense historicamente distantes de qualquer universidade pública —
          Russas, por exemplo, começou com Engenharia de Software em 2014 e hoje soma cursos de Computação,
          Engenharia Civil, Mecânica e Produção. Sobral já tem 5 programas de pós-graduação próprios. Esse modelo
          de interiorização é a aplicação prática do lema "o universal pelo regional": formar profissionais direto
          nas cidades onde vão atuar, sem depender só de Fortaleza.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#464554] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Ingresso: praticamente só SiSU
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          A UFC seleciona virtualmente todos os alunos de graduação via <strong>SiSU</strong>, com a nota do ENEM. O
          candidato se inscreve escolhendo até duas opções de curso, e pode acompanhar a nota de corte em tempo
          real durante o período de inscrições, trocando de opção se precisar. Confirme sempre datas em{' '}
          <a href="https://www.ufc.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            ufc.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufc" customContent={customContent} />
}
