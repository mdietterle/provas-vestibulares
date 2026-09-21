import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const CAMPI = ['Centro', 'Saúde', 'Olímpico', 'Vale', 'Litoral Norte (Tramandaí)']

export default function UfrgsPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Pública federal — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">UFRGS: 5ª melhor do Brasil, 1ª do Sul</h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-4 max-w-2xl">
        Fundada em 1934 em Porto Alegre, a UFRGS é uma das universidades mais bem avaliadas do país, com cerca de
        40 mil estudantes circulando diariamente entre seus campi e institutos.
      </p>

      <div className="flex items-center gap-3 mb-8">
        <div className="text-3xl font-extrabold text-[#4f46e5] dark:text-[#818CF8]">5º</div>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          lugar no Ranking Universitário Folha (RUF) entre todas as universidades brasileiras — <strong>melhor
          universidade do Sul do país</strong> — e um dos maiores volumes de publicação científica do Brasil.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">Cinco campi em Porto Alegre e um no litoral</h3>
        <div className="flex flex-wrap gap-2">
          {CAMPI.map(c => (
            <span key={c} className="text-sm font-semibold text-[#4f46e5] dark:text-[#818CF8] border-2 border-dashed border-[#c5c5d3] dark:border-[#334155] rounded-lg px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8">
        São mais de 90 cursos de graduação (36 em Humanas, 35 em Exatas e 25 em Biológicas), com forte tradição em{' '}
        <strong>Medicina</strong>, <strong>Psicologia</strong>, <strong>Fisioterapia</strong>,{' '}
        <strong>Direito</strong> e <strong>Engenharias</strong> — Medicina é tradicionalmente o curso mais
        concorrido.
      </p>

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: vestibular com leituras obrigatórias de literatura
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          O Concurso Vestibular da UFRGS, conduzido pela COPERSE, é um dos poucos processos seletivos do Brasil que
          exige uma <strong>lista de leituras obrigatórias de literatura</strong> pra redação — uma tradição rara
          entre vestibulares federais, que reforça o peso da formação humanística mesmo em cursos de exatas.
        </p>
      </div>

      <CampusImage
        variant="polaroid-tilt"
        src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Campus_do_Vale%2C_Universidade_Federal_do_Rio_Grande_do_Sul%2C_Porto_Alegre%2C_agosto_de_2018_%281%29.jpg"
        alt="Campus do Vale da UFRGS, em Porto Alegre"
        caption="Campus do Vale, UFRGS"
        credit="Foto: Fronteira / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Ingresso: Concurso Vestibular ou SiSU
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          Inscrições do Concurso Vestibular costumam abrir entre agosto e setembro do ano anterior, com provas em
          novembro/dezembro. Parte das vagas também é preenchida via <strong>SiSU</strong>, seguindo o calendário
          nacional. Confirme sempre em{' '}
          <a href="https://www.ufrgs.br/coperse/" target="_blank" rel="noreferrer" className="underline font-semibold">
            ufrgs.br/coperse
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufrgs" customContent={customContent} />
}
