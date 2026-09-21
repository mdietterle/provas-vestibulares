import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const RULES = [
  'Inscrição só pela internet, no site oficial da Fuvest, dentro do prazo do edital.',
  'A 1ª fase é eliminatória: quem não acerta pelo menos 30% das questões (24 de 80) é desclassificado, mesmo sem zerar a prova.',
  'A nota de corte pra passar de fase muda a cada curso: é a nota do último convocado dentro do limite de 4 vezes o número de vagas.',
  'A 2ª fase pesa o dobro da 1ª na nota final — em alguns cursos, até o triplo.',
  'Cada curso tem disciplinas com peso reforçado na 2ª fase (ex.: Biologia e Química valem mais pra Medicina; História e Geografia, pra Direito).',
]

export default function FuvestPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      {/* Bloco "regras do jogo" — formato de lista de regras numeradas, sem banner nem cards */}
      <div className="bg-[#1E293B] dark:bg-[#10131a] text-white rounded-2xl p-6 sm:p-8 mb-10">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-yellow-300">
          As 5 regras que decidem sua vaga na Fuvest
        </h2>
        <ol className="space-y-3 text-sm">
          {RULES.map((r, i) => (
            <li key={r} className="flex gap-3">
              <span className="shrink-0 font-mono font-bold text-yellow-300">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-white/90 leading-relaxed">{r}</span>
            </li>
          ))}
        </ol>
      </div>

      <CampusImage
        variant="diagonal-strip"
        src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Cidade_universit%C3%A1ria_da_Universidade_de_S%C3%A3o_Paulo_%28USP%29.jpg"
        alt="Vista aérea da Cidade Universitária da USP, campus onde a Fuvest aplica o vestibular, com prédios acadêmicos cercados por área verde"
        caption="Cidade Universitária da USP"
        credit="Foto: Hector.carvalho / Wikimedia Commons, CC BY-SA 3.0"
      />

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#c7c4d7] mb-10">
        A Fuvest organiza o vestibular de ingresso na USP, uma das universidades mais concorridas do Brasil. Diferente
        de um exame único, o processo é dividido em duas fases bem distintas — e entender o peso de cada uma é tão
        importante quanto estudar o conteúdo em si.
      </p>

      {/* Comparação lado a lado das duas fases — em vez de timeline ou tabela, cartões espelhados */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-4">Fase 1 x Fase 2: o duelo que define a nota</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border-2 border-[#E2E8F0] dark:border-[#464554] p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">1ª Fase — a peneira</div>
            <ul className="text-sm text-[#475569] dark:text-[#c7c4d7] space-y-1.5 leading-relaxed">
              <li>80 questões de múltipla escolha</li>
              <li>5 horas de duração</li>
              <li>Conteúdo geral do ensino médio</li>
              <li>Peso 1 na nota final</li>
              <li className="text-red-600 dark:text-red-400 font-semibold">Elimina quem não acerta 30% das questões</li>
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-[#712ae2] dark:border-[#818CF8] p-5 bg-[#F4F6F9] dark:bg-[#1d1f27]">
            <div className="text-xs font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">2ª Fase — o desempate</div>
            <ul className="text-sm text-[#475569] dark:text-[#c7c4d7] space-y-1.5 leading-relaxed">
              <li>Provas dissertativas em 2 dias</li>
              <li>Redação + questões por disciplina</li>
              <li>Disciplinas específicas do curso escolhido</li>
              <li>Peso 2 (ou 3, conforme o curso) na nota final</li>
              <li className="text-green-700 dark:text-green-400 font-semibold">É aqui que a classificação final é decidida</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Barra visual de peso na composição da nota, em vez de texto corrido */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-4">Quanto cada fase pesa na nota final</h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-semibold text-[#475569] dark:text-[#c7c4d7] mb-1">
              <span>1ª Fase</span><span>peso 1</span>
            </div>
            <div className="h-3 rounded-full bg-[#E2E8F0] dark:bg-[#464554] overflow-hidden">
              <div className="h-full bg-[#712ae2]" style={{ width: '33%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-semibold text-[#475569] dark:text-[#c7c4d7] mb-1">
              <span>2ª Fase</span><span>peso 2 (até peso 3 em alguns cursos)</span>
            </div>
            <div className="h-3 rounded-full bg-[#E2E8F0] dark:bg-[#464554] overflow-hidden">
              <div className="h-full bg-[#4f46e5] dark:bg-[#818CF8]" style={{ width: '66%' }} />
            </div>
          </div>
        </div>
        <p className="text-xs text-[#a0a3af] dark:text-[#908fa0] mt-3">
          Na prática: quem vai mal na 1ª fase mas passa raspando ainda tem chance real de virar o jogo na 2ª — e o
          contrário também é verdade. Nenhuma das duas fases pode ser negligenciada.
        </p>
      </div>

      {/* Calendário compacto — linha única, sem cards grandes */}
      <div>
        <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-4">Calendário (Vestibular Fuvest 2027)</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm border-y border-[#E2E8F0] dark:border-[#464554] py-4">
          <div><span className="font-bold text-[#4f46e5] dark:text-[#818CF8]">Inscrição: </span>17 de agosto a 9 de outubro</div>
          <div><span className="font-bold text-[#4f46e5] dark:text-[#818CF8]">1ª fase: </span>1º de novembro</div>
          <div><span className="font-bold text-[#4f46e5] dark:text-[#818CF8]">2ª fase: </span>6 e 7 de dezembro</div>
          <div><span className="font-bold text-[#4f46e5] dark:text-[#818CF8]">Vagas: </span>8.147</div>
        </div>
        <p className="text-xs text-[#a0a3af] dark:text-[#908fa0] mt-3">
          Novidade da edição: provas também aplicadas em Fortaleza (CE), além dos locais tradicionais em São Paulo.
          Datas mudam a cada ano — confirme sempre no edital vigente em{' '}
          <a href="https://www.fuvest.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            fuvest.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="fuvest" customContent={customContent} />
}
