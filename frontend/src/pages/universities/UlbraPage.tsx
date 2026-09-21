import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const CAMPI_RS = ['Canoas (sede)', 'Cachoeira do Sul', 'Carazinho', 'Gravataí', 'Guaíba', 'Santa Maria', 'São Jerônimo', 'Torres']
const CAMPI_OUTROS_ESTADOS = ['Manaus (AM)', 'Itumbiara (GO)', 'Ji-Paraná (RO)', 'Porto Velho (RO)', 'Palmas (TO)', 'Santarém (PA)', 'Sertãozinho (SP)']

export default function UlbraPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">ULBRA: de uma escola paroquial a 21 estados do país</h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8 max-w-2xl">
        A ULBRA tem origem na escola paroquial da Igreja Evangélica Luterana de São Paulo de Canoas (CELSP), fundada
        em 1911, em Canoas (RS). Virou Faculdades Canoenses em 1972 e foi reconhecida como universidade em 1989,
        sob decreto de criação de 1988.
      </p>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Vínculo com a Igreja Luterana
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A universidade é mantida pela <strong>Igreja Evangélica de Confissão Luterana no Brasil (IECLB)</strong>,
          e essa origem confessional segue presente na estrutura institucional — o campus sede em Canoas mantém uma
          capela própria dentro do terreno acadêmico, sinal físico dessa ligação histórica. Na prática, a ULBRA
          funciona como universidade generalista aberta a estudantes de qualquer religião, mas sua identidade
          institucional e sua origem seguem vinculadas à tradição luterana que a fundou.
        </p>
      </div>

      <CampusImage
        variant="float-right"
        src="https://upload.wikimedia.org/wikipedia/commons/e/e6/Capela_da_ULBRA%2C_Canoas_-_RS.jpg"
        alt="Capela da ULBRA, no campus de Canoas (RS)"
        caption="Capela da ULBRA, campus Canoas"
        credit="Foto: Otávio Astor Vaz Costa / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: descentralização em escala nacional, não só regional
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A ULBRA está presente em <strong>85 cidades de 21 estados brasileiros</strong>, com campi universitários
          e escolas em 20 delas e polos de EaD em outras 65. É um grau de descentralização geográfica raro entre
          universidades privadas do país — a maioria concentra expansão numa única região, enquanto a ULBRA saiu
          do Rio Grande do Sul pro Norte (Amazonas, Pará, Rondônia, Tocantins), Centro-Oeste (Goiás) e Sudeste (São
          Paulo).
        </p>
      </div>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/4/48/Pr%C3%A9dio_da_Universidade_Luterana_do_Brasil_%28Ulbra%29%2C_Canoas_-_RS.jpg"
        alt="Prédio principal da Universidade Luterana do Brasil, no campus sede em Canoas (RS)"
        caption="Prédio principal da ULBRA, Canoas (RS)"
        credit="Foto: Otávio Astor Vaz Costa / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">Oito campi no RS, mais seis em outros estados</h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed mb-3">
          No Rio Grande do Sul, além da sede em Canoas:
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {CAMPI_RS.map(c => (
            <span key={c} className="text-sm font-semibold text-[#4f46e5] dark:text-[#818CF8] border-2 border-dashed border-[#c5c5d3] dark:border-[#334155] rounded-lg px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed mb-3">Fora do RS:</p>
        <div className="flex flex-wrap gap-2">
          {CAMPI_OUTROS_ESTADOS.map(c => (
            <span key={c} className="text-sm font-semibold text-[#4f46e5] dark:text-[#818CF8] bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e] rounded-lg px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-10">
        São mais de 60 mil alunos matriculados em 232 cursos de graduação e pós-graduação, presenciais e a
        distância, cobrindo Humanas, Exatas, Biológicas, Saúde e Tecnológicas. Cursos de maior tradição incluem{' '}
        <strong>Medicina</strong>, <strong>Direito</strong>, <strong>Engenharias</strong>,{' '}
        <strong>Psicologia</strong> e <strong>Odontologia</strong>. A universidade também é a única unidade entre
        os campi verificados nesta plataforma que publica provas anteriores de vestibular em PDF.
      </p>

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Ingresso: vestibular contínuo, nota do ENEM ou transferência
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          O processo seletivo da ULBRA é aplicado de forma <strong>contínua e online</strong>, sem necessidade de
          agendamento — o candidato faz a prova pela internet e recebe o resultado na hora. Até 10% das vagas são
          reservadas pra quem usa a <strong>nota do ENEM</strong> (edições de 2016 a 2023) como critério de
          classificação, e também existem vias de ingresso por transferência externa ou segunda graduação. Datas e
          regras mudam por campus — confirme sempre em{' '}
          <a href="https://vestibular.ulbra.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            vestibular.ulbra.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ulbra" customContent={customContent} />
}
