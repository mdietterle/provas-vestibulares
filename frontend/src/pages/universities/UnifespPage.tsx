import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const CAMPI = ['São Paulo (sede)', 'Baixada Santista', 'Diadema', 'Guarulhos', 'Osasco', 'São José dos Campos', 'Zona Leste']

export default function UnifespPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <div className="flex items-start gap-4 mb-8">
        <CampusImage
          variant="corner-badge"
          src="https://upload.wikimedia.org/wikipedia/commons/5/56/Mascote_Nicodemus_da_Escola_Paulista_de_Medicina_da_Universidade_Federal_de_S%C3%A3o_Paulo.jpg"
          alt="Nicodemus, mascote tradicional da Escola Paulista de Medicina da UNIFESP"
          caption="Nicodemus, mascote da Escola Paulista de Medicina"
          credit="Foto: Mtvdanilo / Wikimedia Commons, CC BY 4.0"
        />
        <div>
          <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">UNIFESP: da Escola Paulista de Medicina a sete campi</h2>
          <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300">
            A Escola Paulista de Medicina nasceu em 1933 como escola privada na Vila Clementino, foi federalizada em
            1956 e só em 1994 deu origem à Universidade Federal de São Paulo.
          </p>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Pública federal — sem mensalidade
      </div>

      <div className="rounded-2xl border-l-4 border-slate-500 dark:border-slate-400 bg-slate-50 dark:bg-slate-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: Medicina nº 1 do Brasil, com mascote próprio de quase um século
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          O curso de Medicina da UNIFESP foi classificado em 1º lugar no Ranking Universitário Folha (2016), e a
          universidade aparece entre as 4 melhores da América Latina segundo a Times Higher Education (2022) — a{' '}
          <strong>3ª melhor do Brasil</strong> e a <strong>1ª entre as federais</strong>. Um detalhe curioso e raro:
          a Escola Paulista de Medicina mantém <strong>Nicodemus</strong>, um mascote-esqueleto tradicional que
          acompanha gerações de estudantes de Medicina — um símbolo que atravessa quase um século de história da
          escola.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Sete campi na Grande São Paulo e litoral</h3>
        <div className="flex flex-wrap gap-2">
          {CAMPI.map(c => (
            <span key={c} className="text-sm font-semibold text-slate-600 dark:text-slate-400 border-2 border-dashed border-[#c5c5d3] dark:border-slate-300 rounded-lg px-3 py-1.5">
              {c}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-10">
        O Campus São Paulo reúne a Escola Paulista de Medicina (Medicina, Biomedicina, Fonoaudiologia, tecnologias
        oftálmica e de Radiologia) e a Escola Paulista de Enfermagem. Nos demais campi, a UNIFESP expandiu pra{' '}
        <strong>Ciências Biológicas</strong>, <strong>Psicologia</strong>, <strong>Relações Internacionais</strong>{' '}
        e <strong>Ciência da Computação</strong>, diversificando bastante além do perfil só de saúde da fundação.
      </p>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Avaliação MEC: nota máxima por oito anos seguidos
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          A UNIFESP alcançou nota máxima (5) do MEC pelo <strong>oitavo ano consecutivo</strong> — entre 2.012
          instituições avaliadas no ciclo, só 46 (2,3%) chegaram nessa nota. Cursos como{' '}
          <strong>Nutrição</strong> (campus Baixada Santista), <strong>Enfermagem</strong>,{' '}
          <strong>Medicina</strong> e <strong>Tecnologia em Radiologia</strong> (campus São Paulo) tiraram nota 5
          no Enade, e as licenciaturas da universidade também tiveram desempenho de destaque no Enade 2025 — sinal
          de consistência que vai além do prestígio histórico da Escola Paulista de Medicina.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Papel no desenvolvimento da Grande São Paulo
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          Ao se espalhar por sete campi — de Guarulhos a Diadema, de Osasco à Baixada Santista — a UNIFESP levou
          ensino federal gratuito de excelência pra regiões metropolitanas que historicamente dependiam só de
          faculdades privadas ou de deslocamento até a capital. Isso reduz a concentração de vagas públicas só na
          cidade de São Paulo e ajuda a formar profissionais de saúde e ciência justamente nas periferias e
          municípios vizinhos que mais precisam desses serviços.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#464554] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Ingresso: SiSU, com sistema misto em alguns cursos
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          O ingresso é majoritariamente via <strong>SiSU</strong> (nota do ENEM), seguindo o cronograma nacional.
          Alguns cursos usam um sistema misto, com provas complementares próprias além da nota do ENEM. Confirme
          sempre em{' '}
          <a href="https://ingresso.unifesp.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            ingresso.unifesp.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="unifesp" customContent={customContent} />
}
