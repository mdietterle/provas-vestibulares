import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const CAMPI = ['Passo Fundo (sede, 2 campi)', 'Carazinho', 'Casca', 'Lagoa Vermelha', 'Sarandi', 'Soledade']

export default function UpfPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade privada comunitária, sem fins lucrativos
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        UPF: a maior universidade do norte gaúcho
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8 max-w-2xl">
        A Fundação Universidade de Passo Fundo nasceu em 1967, da fusão da Sociedade Pró-Universidade com o
        Consórcio Universitário Católico, e foi reconhecida oficialmente como universidade em 1968. Mantida sem
        fins lucrativos, é hoje a maior instituição de ensino superior do norte do Rio Grande do Sul, sustentada
        por quatro pilares declarados: ensino, pesquisa, extensão e inovação tecnológica.
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/d/d2/UPF_Campus.jpg"
        alt="Campus da Universidade de Passo Fundo (UPF), no Rio Grande do Sul"
        caption="Campus da UPF, Passo Fundo"
        credit="Foto: Portal UPF / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 my-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Avaliação MEC: nota máxima institucional em 2023
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          Em 2023, a UPF recebeu <strong>nota máxima (5) no Conceito Institucional</strong> do MEC — a avaliação
          mais abrangente que o ministério aplica, olhando pra universidade como um todo (não só cursos isolados).
          É um resultado raro entre universidades comunitárias do interior, geralmente mais pequenas e com menos
          recursos de pesquisa que grandes centros como Porto Alegre.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">
          Sete campi, seis cidades do norte do RS
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed mb-3">
          Além dos dois campi na sede em Passo Fundo, a UPF tem unidades em outras cinco cidades da região:
        </p>
        <div className="flex flex-wrap gap-2">
          {CAMPI.map(c => (
            <span key={c} className="text-sm font-semibold text-[#2563EB] dark:text-[#818CF8] border-2 border-dashed border-[#c5c5d3] dark:border-[#334155] rounded-lg px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8">
        São mais de 50 cursos de graduação, 15 mestrados, 9 doutorados e 250+ cursos de pós-graduação lato sensu.
        Cursos de maior destaque incluem <strong>Medicina</strong>, <strong>Direito</strong>,{' '}
        <strong>Agronomia</strong>, <strong>Medicina Veterinária</strong> e <strong>Engenharias</strong> — um
        perfil que reflete diretamente a vocação agroindustrial da região norte do Rio Grande do Sul.
      </p>

      <CampusImage
        variant="polaroid-tilt"
        src="https://upload.wikimedia.org/wikipedia/commons/1/16/Fachada_Biblioteca_Central.jpg"
        alt="Fachada da Biblioteca Central da UPF"
        caption="Biblioteca Central da UPF"
        credit="Foto: Universidadeupf / Wikimedia Commons, domínio público (CC0)"
      />

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">
          Papel no desenvolvimento do norte gaúcho: o Passo Fundo Valley
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A UPF mantém o <strong>Passo Fundo Valley</strong>, um distrito de inovação de 10 hectares que organiza o
          ecossistema empreendedor da região em cinco verticais estratégicas: Agronegócio, Saúde, Indústria
          Criativa, Educação e Tecnologia da Informação. A universidade também integra o conselho do{' '}
          <strong>TecnoAgro</strong>, iniciativa de inovação em agronegócio e agroenergia — reflexo direto de como
          uma universidade privada comunitária pode se tornar o centro de pesquisa aplicada de uma região inteira.
          A estrutura multicampi (sete unidades em seis cidades) também facilita o acesso ao ensino superior fora
          da capital do estado, ajudando a reter mão de obra qualificada nas próprias cidades da região Norte,
          Noroeste e Missões do Rio Grande do Sul, em vez de forçar migração pra Porto Alegre.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-3">
          Como entrar: nota de redação, não vestibular objetivo
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed mb-4">
          A UPF simplificou seu processo seletivo: hoje a nota de corte vem da <strong>redação</strong>, não de uma
          prova objetiva tradicional. O candidato escolhe entre três modalidades no ato da inscrição.
        </p>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Redação presencial</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Prova de redação aplicada no campus, em data marcada</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Redação on-line</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Feita pela internet, dentro de uma janela de datas</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Nota da redação do ENEM</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Aproveita a nota de redação de qualquer edição do ENEM desde 2010</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Calendário</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Vestibular de Verão (2º semestre do ano anterior) e de Inverno (1º semestre)</dd>
          </div>
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#6b7385]">
          Datas, taxas e vagas mudam a cada edição — confirme sempre em{' '}
          <a href="https://www.upf.br/ingresso" target="_blank" rel="noreferrer" className="underline font-semibold">
            upf.br/ingresso
          </a>. O banco de simulados do Cognition AI já traz questões reais de edições anteriores do vestibular
          objetivo da UPF (anos em que a prova ainda seguia o formato de múltipla escolha).
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="upf" customContent={customContent} />
}
