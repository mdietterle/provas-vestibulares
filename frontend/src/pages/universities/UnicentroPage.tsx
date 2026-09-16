import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const CAMPI = ['Guarapuava — Santa Cruz (sede)', 'Guarapuava — Cedeteg', 'Irati', 'Chopinzinho', 'Coronel Vivida', 'Pitanga', 'Prudentópolis']

const INGRESSO = [
  { via: 'Vestibular próprio', texto: 'Prova anual em outubro, organizada pela própria universidade — via de ingresso mais tradicional.' },
  { via: 'SiSU', texto: '723 vagas reservadas pra quem usa a nota do ENEM, seguindo o calendário nacional do MEC.' },
  { via: 'PAC (Programa de Avaliação Continuada)', texto: 'Seleção alternativa baseada em avaliação continuada ao longo do ensino médio, sem prova única.' },
]

export default function UnicentroPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade pública estadual — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        UNICENTRO: a única pública estadual do centro-sul do Paraná
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8 max-w-2xl">
        A UNICENTRO nasceu da fusão de duas faculdades públicas paranaenses já existentes havia décadas: a
        Faculdade de Filosofia, Ciências e Letras de Guarapuava (Fafig, 1970) e a Faculdade de Educação, Ciências e
        Letras de Irati (Fecli, 1974). A instituição foi transformada em universidade em 1997, com sede em
        Guarapuava.
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/1/17/Universidade_Estadual_do_Centro-Oeste_-_Guarapuava_PR.jpg"
        alt="Campus da Universidade Estadual do Centro-Oeste (UNICENTRO), em Guarapuava (PR)"
        caption="Campus da UNICENTRO, Guarapuava"
        credit="Foto: recados.net.br / Wikimedia Commons, CC BY 2.0"
      />

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 my-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: referência regional numa região sem outra pública estadual por perto
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A UNICENTRO é a principal (e praticamente única) universidade pública estadual cobrindo o centro-sul do
          Paraná, uma região historicamente mais distante do eixo Curitiba-Londrina-Maringá que concentra a maioria
          das outras estaduais paranaenses. Sua estrutura multicampi leva ensino público gratuito a sete cidades,
          incluindo municípios pequenos como Chopinzinho e Prudentópolis, que dificilmente teriam acesso a uma
          universidade estadual sem essa descentralização.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-3">Sete campi e unidades no Paraná</h3>
        <div className="flex flex-wrap gap-2">
          {CAMPI.map(c => (
            <span key={c} className="text-sm font-semibold text-[#2563EB] dark:text-[#818CF8] border-2 border-dashed border-[#c5c5d3] dark:border-[#334155] rounded-lg px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-10">
        São 43 cursos de graduação, presenciais e a distância, com tradição consolidada em{' '}
        <strong>Fisioterapia</strong>, <strong>Enfermagem</strong>, <strong>Psicologia</strong>,{' '}
        <strong>Nutrição</strong>, <strong>Farmácia</strong> e <strong>Engenharia Ambiental</strong> — perfil
        forte em saúde, que reflete a demanda regional por profissionais dessa área. Em pós-graduação, a
        UNICENTRO já criou 17 programas stricto sensu desde seu primeiro mestrado (Química, em 2006), sendo 8
        deles já com doutorado. No IGC/MEC de 2019, a universidade ficou entre as 31 melhores do Brasil, num
        ranking com 194 instituições avaliadas — mantendo conceito 4.
      </p>

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-3">
          Como entrar: três vias de ingresso
        </h3>
        <dl className="space-y-3 text-sm mb-4">
          {INGRESSO.map(i => (
            <div key={i.via} className="flex gap-3">
              <dt className="font-bold text-[#1E293B] dark:text-white shrink-0 w-56">{i.via}</dt>
              <dd className="text-[#475569] dark:text-[#94a3b8]">{i.texto}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#6b7385]">
          O processo seletivo de 2027 ofereceu 1.154 vagas em 43 cursos, com taxa de R$ 180 (isenta pra
          licenciaturas). Datas mudam a cada edital — confirme sempre em{' '}
          <a href="https://www3.unicentro.br/vestibular/" target="_blank" rel="noreferrer" className="underline font-semibold">
            unicentro.br/vestibular
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="unicentro" customContent={customContent} />
}
