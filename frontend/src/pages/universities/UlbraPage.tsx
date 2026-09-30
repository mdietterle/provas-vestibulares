import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const CAMPI_RS = ['Canoas (sede)', 'Cachoeira do Sul', 'Carazinho', 'Gravataí', 'Guaíba', 'Santa Maria', 'São Jerônimo', 'Torres']
const CAMPI_OUTROS_ESTADOS = ['Manaus (AM)', 'Itumbiara (GO)', 'Palmas (TO)', 'Santarém (PA)']

export default function UlbraPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">ULBRA: de uma escola paroquial a unidades em três regiões do país</h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#c7c4d7] mb-8 max-w-2xl">
        A ULBRA tem origem na escola paroquial da Igreja Evangélica Luterana de São Paulo de Canoas (CELSP), fundada
        em 1911, em Canoas (RS). Virou Faculdades Canoenses em 1972 e foi reconhecida como universidade em 1989,
        sob decreto de criação de 1988.
      </p>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Vínculo com a Igreja Luterana
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
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
          Diferencial: presença em três regiões do Brasil
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
          Segundo o site oficial, a ULBRA tem <strong>mais de 10 unidades de ensino em 3 regiões do Brasil</strong>,
          com unidades e polos ativos em mais de 9 estados, cerca de <strong>20 mil alunos matriculados</strong> e mais
          de <strong>500 mil egressos</strong> em <strong>53 anos de história</strong>. Além do Rio Grande do Sul, há
          unidades no Norte (Amazonas, Tocantins e Pará) e no Centro-Oeste (Goiás), além de polos de ensino a
          distância em vários estados.
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
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">Oito campi no RS, mais quatro em outros estados</h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed mb-3">
          No Rio Grande do Sul, além da sede em Canoas:
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {CAMPI_RS.map(c => (
            <span key={c} className="text-sm font-semibold text-[#4f46e5] dark:text-[#818CF8] border-2 border-dashed border-[#c5c5d3] dark:border-[#c7c4d7] rounded-lg px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed mb-3">Fora do RS:</p>
        <div className="flex flex-wrap gap-2">
          {CAMPI_OUTROS_ESTADOS.map(c => (
            <span key={c} className="text-sm font-semibold text-[#4f46e5] dark:text-[#818CF8] bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554] rounded-lg px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#c7c4d7] mb-10">
        Os cursos cobrem áreas como Saúde, Direito, Gestão e Tecnologia, e existem unidades específicas de Medicina
        (Faculdade Ulbra Medicina em Gravataí, Porto Alegre e São Jerônimo, e unidades em Manaus, Palmas e Santarém). No edital de 2027/1 do vestibular regular, os cursos presenciais com vagas incluem{' '}
        <strong>Direito</strong>, <strong>Psicologia</strong>, <strong>Odontologia</strong>,{' '}
        <strong>Fisioterapia</strong>, <strong>Enfermagem</strong> e <strong>Medicina Veterinária</strong>. Nesta plataforma há provas reais de edições
        anteriores do vestibular (2016 a 2019), úteis para treino de interpretação e de conteúdo, embora o processo atual
        seja uma redação.
      </p>

      <div className="border-t border-[#E2E8F0] dark:border-[#464554] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Ingresso: redação online ou nota da redação do ENEM
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
          Segundo o edital de 2027/1, o vestibular da ULBRA é feito <strong>online, sem necessidade de agendamento</strong>:
          o candidato escreve uma redação em Língua Portuguesa, com no mínimo 2.500 caracteres e duração de 1 hora, e é
          habilitado ao obter pelo menos 50% da pontuação. Quem preferir pode usar a <strong>nota da redação do ENEM</strong>{' '}
          (edições de 2016 a 2025, com mínimo de 200 pontos), e a instituição pode reservar até 10% das vagas de cada curso
          a essa modalidade. Ser habilitado não garante a vaga: elas são ocupadas pela ordem em que os candidatos efetivam o
          ingresso. Datas e regras podem mudar a cada edital; confirme sempre em{' '}
          <a href="https://www.ulbra.br/vestibular" target="_blank" rel="noreferrer" className="underline font-semibold">
            ulbra.br/vestibular
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ulbra" customContent={customContent} />
}
