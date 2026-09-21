import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const STATS = [
  { valor: '2ª', rotulo: 'melhor universidade da América Latina (THE 2026)' },
  { valor: '15%', rotulo: 'de toda a produção científica brasileira' },
  { valor: '5º', rotulo: 'lugar nacional em patentes depositadas no INPI' },
  { valor: '500+', rotulo: 'empresas criadas por egressos nos últimos 30 anos' },
]

const CAMPI = [
  { nome: 'Campinas (Barão Geraldo)', desc: 'Campus principal — 21 institutos e faculdades, além do Cotuca (Colégio Técnico)' },
  { nome: 'Limeira', desc: 'Faculdade de Tecnologia e Faculdade de Ciências Aplicadas' },
  { nome: 'Piracicaba', desc: 'Faculdade de Odontologia (FOP)' },
]

const INGRESSO = [
  { via: 'Vestibular Unicamp', texto: 'Duas fases pela Comvest: 1ª fase objetiva (72 questões) em outubro, 2ª fase dissertativa em novembro.' },
  { via: 'Enem-Unicamp', texto: 'Usa a nota do ENEM como primeiro filtro, seguido de prova de Leitura e Interpretação de Texto (PLIT) e de Conhecimentos Específicos (PCE).' },
  { via: 'Vestibular Indígena', texto: 'Processo seletivo próprio para candidatos indígenas, com vagas e cronograma específicos.' },
  { via: 'Olimpíadas Científicas', texto: 'Vaga direta para medalhistas de olimpíadas científicas reconhecidas, sem prova adicional.' },
]

export default function UnicampPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      {/* Tira de estatísticas no topo — primeira coisa que o leitor vê */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#E2E8F0] dark:bg-[#464554] rounded-2xl overflow-hidden mb-8 border border-[#E2E8F0] dark:border-[#464554]">
        {STATS.map(s => (
          <div key={s.rotulo} className="bg-white dark:bg-[#191b23] p-4 text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#4f46e5] dark:text-[#818CF8]">{s.valor}</div>
            <div className="text-[11px] text-[#64748B] dark:text-[#c7c4d7] mt-1 leading-tight">{s.rotulo}</div>
          </div>
        ))}
      </div>

      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade pública estadual — sem mensalidade
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-[#1E293B] dark:text-white mb-2">
        UNICAMP: jovem, mas entre as maiores potências científicas da América Latina
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#c7c4d7] mb-8 max-w-2xl">
        Fundada em 1966 em Campinas (SP), a UNICAMP é uma universidade pública estadual relativamente nova se
        comparada a USP ou UFRGS — e ainda assim se consolidou como uma das mais influentes do continente. Sozinha,
        responde por cerca de <strong>15% de toda a produção científica do Brasil</strong>, e supera universidades
        muito maiores em geração de patentes: fica atrás só da Petrobras entre todas as organizações de pesquisa do
        país, e lidera o ranking paulista de depósitos no INPI pelo terceiro ano seguido.
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/6/64/Observatorio_da_Unicamp_-_panoramio.jpg"
        alt="Observatório da UNICAMP, no campus de Barão Geraldo, em Campinas"
        caption="Observatório astronômico da UNICAMP, campus Barão Geraldo"
        credit="Foto: Paulo Humberto / Wikimedia Commons, CC BY-SA 3.0"
      />

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 my-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: o Ciclo Básico, um ano em comum antes de escolher rumo
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
          Diferente da maioria das universidades, boa parte dos calouros da UNICAMP passa pelo{' '}
          <strong>Ciclo Básico</strong> (conhecido informalmente pelos apelidos "Olho Esquerdo" e "Olho Direito",
          dois blocos de prédios espelhados) — um conjunto de disciplinas fundamentais cursadas junto com colegas
          de outros cursos, antes da imersão total na área escolhida. É um modelo raro de integração entre calouros
          de cursos diferentes logo no primeiro ano.
        </p>
      </div>

      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-3">Três campi, um só estado</h3>
        <div className="space-y-3">
          {CAMPI.map(c => (
            <div key={c.nome} className="flex gap-4 p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
              <div className="font-bold text-[#4f46e5] dark:text-[#818CF8] shrink-0 w-40">{c.nome}</div>
              <div className="text-sm text-[#475569] dark:text-[#c7c4d7]">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <CampusImage
        variant="polaroid-tilt"
        src="https://upload.wikimedia.org/wikipedia/commons/0/0a/Biblioteca_de_Obras_Raras_da_Unicamp_01.jpg"
        alt="Biblioteca de Obras Raras da UNICAMP"
        caption="Biblioteca de Obras Raras, UNICAMP"
        credit="Foto: Sintegrity / Wikimedia Commons, CC BY-SA 4.0"
      />

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#c7c4d7] mb-8">
        São 24 unidades de ensino e pesquisa (10 institutos e 14 faculdades) e 65 cursos de graduação. As áreas
        mais concorridas incluem <strong>Medicina</strong>, <strong>Engenharia da Computação</strong>,{' '}
        <strong>Engenharia de Alimentos</strong>, <strong>Odontologia</strong> e <strong>Ciências
        Econômicas</strong> — com forte tradição também em Física e Química, áreas que sustentam boa parte da
        produção científica da universidade.
      </p>

      <div className="rounded-2xl border-l-4 border-[#712ae2] dark:border-[#818CF8] bg-[#F4F6F9] dark:bg-[#1d1f27] p-5 mb-10">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">Egresso que virou lenda da física brasileira</h3>
        <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
          A UNICAMP formou 74 pesquisadores entre os mais influentes do mundo, segundo levantamentos internacionais.
          Um dos nomes mais associados à sua história é <strong>César Lattes</strong>, físico brasileiro célebre
          pela codescoberta do méson pi, que atuou como pesquisador ligado à instituição em seus primeiros anos —
          parte do núcleo científico que ajudou a projetar a jovem universidade em física e pesquisa de ponta desde
          a fundação.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#464554] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-3">
          Como entrar: quatro portas de acesso
        </h3>
        <div className="space-y-4">
          {INGRESSO.map((i, idx) => (
            <div key={i.via} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#4f46e5] dark:bg-[#712ae2] text-white text-xs font-bold flex items-center justify-center">{idx + 1}</span>
              <div>
                <div className="font-bold text-[#1E293B] dark:text-white text-sm">{i.via}</div>
                <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">{i.texto}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#a0a3af] dark:text-[#908fa0] mt-4">
          É possível se inscrever em mais de uma modalidade na mesma edição. O Vestibular Unicamp 2027 ofereceu
          2.523 vagas em 70 opções de curso, com taxa em torno de R$ 230. Datas e vagas mudam a cada edital —
          confirme sempre em{' '}
          <a href="https://www.comvest.unicamp.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            comvest.unicamp.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="unicamp" customContent={customContent} />
}
