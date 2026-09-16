import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const CAMPI = ['Goiânia — Samambaia (sede)', 'Goiânia — Colemar Natal e Silva', 'Aparecida de Goiânia', 'Catalão', 'Jataí', 'Cidade de Goiás']

export default function UfgPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade pública federal - educação gratuita de qualidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        UFG: a principal federal do Centro-Oeste, com sede em Goiânia
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8 max-w-2xl">
        A Universidade Federal de Goiás foi fundada em 14 de dezembro de 1960, em Goiânia, por decreto do
        presidente Juscelino Kubitschek. É uma das principais instituições públicas da região Centro-Oeste, com mais
        de 150 cursos de graduação, cerca de 60 mestrados e mais de 30 doutorados.
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/1/16/Reitoria_da_UFG%2C_Campus_Samambaia%2C_Goi%C3%A2nia%2C_dezembro_de_2022_%281%29.jpg"
        alt="Prédio da Reitoria da UFG, no campus Samambaia, em Goiânia"
        caption="Reitoria da UFG, campus Samambaia, Goiânia"
        credit="Foto: Fronteira / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">Seis campi, quatro cidades</h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed mb-3">
          A sede fica no campus Samambaia, o maior deles, com quase 190 mil m² de área construída. Além dele, a UFG
          tem mais um campus em Goiânia (Colemar Natal e Silva) e unidades em outras três cidades goianas:
        </p>
        <div className="flex flex-wrap gap-2">
          {CAMPI.map(c => (
            <span key={c} className="text-sm font-semibold text-[#2563EB] dark:text-[#818CF8] border-2 border-dashed border-[#c5c5d3] dark:border-[#334155] rounded-lg px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: curso de IA pioneiro na América Latina, mais concorrido que Medicina
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          Lançado em 2020, o bacharelado em <strong>Inteligência Artificial</strong> da UFG foi o primeiro do gênero
          na América Latina — e os resultados aparecem: no SiSU 2026, teve a <strong>2ª maior nota de corte do
          Brasil</strong> (846,72 pontos), superando Medicina em quase todo o país e ficando atrás só de uma vaga de
          Medicina na Unilab (CE). A UFG também aparece entre as maiores notas do país com Engenharia de Software
          (11ª posição nacional) — sinal de que cursos de tecnologia da universidade competem de igual pra igual
          com os tradicionalmente mais concorridos do Brasil.
        </p>

        <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-900/40 space-y-3 text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          <p>
            O curso nasceu de uma parceria entre a UFG e a Fundação de Amparo à Pesquisa do Estado de Goiás (Fapeg),
            firmada em 2019, e foi o <strong>primeiro bacharelado público em Inteligência Artificial do Brasil</strong>,
            oferecido pelo Instituto de Informática (INF). A grade tem 34 disciplinas ao longo de 4 anos: os dois
            primeiros anos dão base sólida em computação e matemática, e os dois últimos aprofundam em técnicas e
            metodologias específicas de IA, terminando com uma fase de integração de projeto.
          </p>
          <p>
            A primeira turma entrou em 2020 com 40 vagas via SiSU e se formou em março de 2024 — todos os graduados
            já saíram empregados, em empresas dentro e fora do Brasil. Hoje o INF recebe cerca de 120 novos alunos
            por ano somando seus quatro cursos (IA, Ciência da Computação, Engenharia de Software e Sistemas de
            Informação).
          </p>
          <p>
            O diferencial mais forte é a proximidade com o mercado: há 45 projetos de inovação em andamento com
            empresas, e cerca de <strong>85% dos alunos têm o curso custeado por parcerias empresariais</strong>.
            Quem atua no CEIA (Centro de Estudos de Inteligência Artificial da UFG) recebe bolsa que começa entre
            R$ 1,5 mil e R$ 2 mil nos primeiros semestres e pode chegar a R$ 10-12 mil pros alunos mais avançados —
            trabalhando em projetos reais de setores como saúde, agro, logística, TV e mercado imobiliário.
          </p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-10">
        Além de Inteligência Artificial e Engenharia de Software, outros cursos fortes incluem{' '}
        <strong>Medicina</strong>, <strong>Direito</strong>, <strong>Psicologia</strong> e{' '}
        <strong>Fisioterapia</strong> — tradicionalmente entre os de maior nota de corte do SiSU na universidade.
      </p>

      <CampusImage
        variant="diagonal-strip"
        src="https://upload.wikimedia.org/wikipedia/commons/f/f1/Vista_noturna_do_pr%C3%A9dio_do_Hospital_das_Cl%C3%ADnicas%2C_UFG%2C_Goi%C3%A2nia%2C_junho_de_2025_%281%29.jpg"
        alt="Prédio do Hospital das Clínicas da UFG, em Goiânia, iluminado à noite"
        caption="Hospital das Clínicas da UFG, Goiânia"
        credit="Foto: Fronteira / Wikimedia Commons, CC BY-SA 4.0"
      />

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-10">
        A UFG mantém o Hospital das Clínicas, unidade de referência em saúde de alta complexidade integrada ao SUS e
        campo de formação prática pros cursos da área de saúde — um serviço direto à população goiana que também
        sustenta boa parte da pesquisa clínica da universidade.
      </p>

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-3">
          Como entrar: metade SiSU, metade vestibular próprio
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed mb-4">
          A UFG divide as vagas de cada curso meio a meio entre <strong>SiSU</strong> (nota do ENEM) e{' '}
          <strong>vestibular próprio</strong>, aplicado pelo Instituto Verbena/UFG. A prova acontece num único dia,
          em dois turnos: manhã (redação + 24 questões de Linguagens) e tarde (72 questões de Humanas, Natureza e
          Matemática).
        </p>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Inscrições</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Fim de junho a início de agosto (taxa ~R$ 130)</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">Prova (fase única)</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Fim de setembro, dois turnos</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">1ª chamada</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Meados de dezembro</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1a2542] border border-[#E2E8F0] dark:border-[#28385e]">
            <dt className="font-bold text-[#2563EB] dark:text-[#818CF8]">SiSU</dt>
            <dd className="text-[#475569] dark:text-[#cbd5e1] mt-1">Segue o calendário nacional do MEC</dd>
          </div>
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#6b7385] mt-3">
          Isenção de taxa disponível logo após a abertura das inscrições. Datas mudam a cada edital — confirme
          sempre em{' '}
          <a href="https://ufg.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            ufg.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufg" customContent={customContent} />
}
