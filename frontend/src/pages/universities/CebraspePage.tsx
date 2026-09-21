import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function CebraspePage() {
  const customContent = (
    <div className="space-y-10 mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      {/* Banner Principal */}
      <div className="bg-gradient-to-br from-[#4f46e5] via-[#1a3a8a] to-[#712ae2] text-white p-6 sm:p-10 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-yellow-300 bg-white/10 px-3 py-1 rounded-full mb-3">
            Tudo o que você precisa saber
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-white leading-tight">
            Guia do Vestibular Cebraspe: o que é, quem usa e como funciona
          </h2>
          <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-2xl font-normal">
            Cebraspe não é uma universidade — é a banca organizadora por trás do vestibular da UnB e de outras
            instituições. Entenda a diferença antes de se inscrever, porque ela muda como você deve estudar.
          </p>
        </div>
      </div>

      {/* Seção 1: O que é o Cebraspe */}
      <section className="bg-white dark:bg-[#191b23] border border-[#E2E8F0] dark:border-[#464554] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            O que é o Cebraspe?
          </h2>
          <div className="text-sm text-[#475569] dark:text-[#c7c4d7] mt-4 space-y-4 leading-relaxed">
            <p>
              O Cebraspe (Centro Brasileiro de Pesquisa em Avaliação e Seleção e de Promoção de Eventos) é uma
              instituição sem fins lucrativos vinculada à UnB, conhecida principalmente por organizar grandes concursos
              públicos no Brasil. Mas ele também atua como <strong>banca organizadora de vestibulares</strong>: elabora,
              aplica e corrige a prova, mas quem define regras, vagas e cursos é cada universidade contratante.
            </p>
            <p>
              Isso é diferente do ACAFE, que é um consórcio de instituições fazendo uma prova única e compartilhada.
              No modelo Cebraspe, <strong>cada universidade tem seu próprio vestibular, edital e cronograma</strong> —
              o Cebraspe só empresta a estrutura de aplicação e correção, que costuma seguir o mesmo padrão de
              qualidade usado nos concursos públicos que a banca organiza.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm leading-relaxed">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
              Universidades que usam o Cebraspe como banca
            </h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {['UnB (Universidade de Brasília)', 'Uncisal (Univ. Estadual de Ciências da Saúde de Alagoas)', 'UFV (Universidade Federal de Viçosa)', 'UESB (Univ. Estadual do Sudoeste da Bahia)', 'UERR (Univ. Estadual de Roraima)', 'UFAC (Univ. Federal do Acre — vestibular de Medicina)'].map(u => (
                <span key={u} className="bg-white dark:bg-[#10131a] border border-[#cbd5e1] dark:border-[#c7c4d7] px-2.5 py-1 rounded-md font-semibold text-[#4f46e5] dark:text-[#818CF8]">
                  {u}
                </span>
              ))}
            </div>
            <p className="text-xs text-[#a0a3af] dark:text-[#908fa0] mt-3">
              A UnB é o processo mais tradicional e concorrido entre eles. Cada instituição tem edital, vagas e
              calendário próprios — verifique sempre no portal do vestibular específico da universidade que te interessa.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm leading-relaxed">
          <h3 className="font-bold text-base text-[#1E293B] dark:text-white">
            Quais universidades usam o Cebraspe como banca e para quais cursos?
          </h3>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            <div className="p-4 rounded-xl bg-white dark:bg-[#10131a] border border-[#E2E8F0] dark:border-[#464554]">
              <dt className="font-bold text-[#4f46e5] dark:text-[#818CF8]">UnB</dt>
              <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Vestibular tradicional de ampla concorrência para todos os cursos de graduação (além do Vestibular UnB 60mais).</dd>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#10131a] border border-[#E2E8F0] dark:border-[#464554]">
              <dt className="font-bold text-[#4f46e5] dark:text-[#818CF8]">Uncisal</dt>
              <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Cursos de saúde — Medicina, Fisioterapia, Fonoaudiologia, Terapia Ocupacional, Enfermagem, além de tecnólogos como Radiologia e Gestão Hospitalar.</dd>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#10131a] border border-[#E2E8F0] dark:border-[#464554]">
              <dt className="font-bold text-[#4f46e5] dark:text-[#818CF8]">UFV</dt>
              <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">PASES — Programa de Avaliação Seriada para Ingresso na UFV, aplicado em etapas ao longo de um ciclo de três anos (ex.: 2025–2027), não uma prova única.</dd>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#10131a] border border-[#E2E8F0] dark:border-[#464554]">
              <dt className="font-bold text-[#4f46e5] dark:text-[#818CF8]">UESB</dt>
              <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Vestibular regular da universidade estadual baiana.</dd>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#10131a] border border-[#E2E8F0] dark:border-[#464554]">
              <dt className="font-bold text-[#4f46e5] dark:text-[#818CF8]">UERR</dt>
              <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Vestibular regular; passou a usar o Cebraspe a partir da edição 2026.</dd>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#10131a] border border-[#E2E8F0] dark:border-[#464554]">
              <dt className="font-bold text-[#4f46e5] dark:text-[#818CF8]">UFAC</dt>
              <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Vestibular específico para o curso de Medicina, a partir de 2026.</dd>
            </div>
          </dl>
          <p className="text-xs text-[#a0a3af] dark:text-[#908fa0]">
            Essa lista muda com o tempo — o Cebraspe fecha e encerra contratos com universidades a cada ciclo de
            licitação. Confirme sempre em{' '}
            <a href="https://www.cebraspe.org.br/vestibulares/" target="_blank" rel="noreferrer" className="underline font-semibold">
              cebraspe.org.br/vestibulares
            </a>{' '}
            se a instituição que te interessa ainda usa essa banca.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <CampusImage
            variant="float-right"
            src="https://upload.wikimedia.org/wikipedia/commons/7/77/BSAS_-_Bloco_de_Salas_de_Aula_Sul._%2843252002542%29.jpg"
            alt="Bloco de Salas de Aula Sul, no campus Darcy Ribeiro da UnB, principal instituição que usa o Cebraspe como banca"
            caption="Bloco de Salas de Aula Sul, campus Darcy Ribeiro (UnB)"
            credit="Foto: Universidade de Brasília / Secom UnB, via Wikimedia Commons, CC BY 2.0"
          />
          <CampusImage
            variant="float-right"
            src="https://upload.wikimedia.org/wikipedia/commons/f/fc/Universidade_Federal_de_Vi%C3%A7osa_-_Pr%C3%A9dio_principal%2C_2015.jpg"
            alt="Prédio Arthur Bernardes, prédio principal da Universidade Federal de Viçosa (UFV), que usa o Cebraspe no processo PASES"
            caption="Prédio Arthur Bernardes, UFV"
            credit="Foto: Mateus S. Figueiredo / Wikimedia Commons, CC BY-SA 4.0"
          />
        </div>
      </section>

      {/* Seção 2: Cebraspe usa TRI? Parece com ENEM ou ACAFE? */}
      <section className="bg-white dark:bg-[#191b23] border border-[#E2E8F0] dark:border-[#464554] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            Parece mais com o ENEM ou com o ACAFE?
          </h2>
          <div className="text-sm text-[#475569] dark:text-[#c7c4d7] mt-4 space-y-4 leading-relaxed">
            <p>
              Em <strong>abrangência</strong>, o vestibular Cebraspe/UnB se parece mais com o ACAFE do que com o ENEM:
              é um processo específico de uma única instituição (ou de poucas, cada uma com processo separado), e a nota
              só vale pra ela — diferente do ENEM, que é nacional e vale pra milhares de instituições via SiSU. Mas,
              diferente do ACAFE (que é um consórcio de várias faculdades numa prova só), no Cebraspe cada universidade
              tem sua própria prova, edital e cronograma independentes.
            </p>
          </div>
        </div>

        <div className="bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554] rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-base text-[#4f46e5] dark:text-[#818CF8]">
            Sim, o vestibular da UnB usa TRI
          </h3>
          <p className="text-sm text-[#475569] dark:text-[#c7c4d7] leading-relaxed">
            Em <strong>metodologia de correção</strong>, o vestibular Cebraspe/UnB se parece com o ENEM: a nota final é
            calculada pela Teoria de Resposta ao Item (TRI), então o número de acertos não corresponde diretamente à
            nota — o que pesa é o padrão de coerência das respostas, não só a quantidade de questões certas. Some a isso
            um sistema de pesos por grupo de curso (Humanas num grupo, Saúde e Exatas em outro), que dá peso diferente
            às provas dependendo do curso escolhido. Ou seja: mesma lógica de correção do ENEM, mas aplicada a um
            processo seletivo específico de uma universidade, com estrutura de prova e calendário próprios.
          </p>
        </div>
      </section>

      {/* Seção 3: Datas importantes */}
      <section className="bg-white dark:bg-[#191b23] border border-[#E2E8F0] dark:border-[#464554] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white">
            Datas importantes (Vestibular UnB 2026, como referência)
          </h2>
          <p className="text-sm text-[#475569] dark:text-[#c7c4d7] mt-2 leading-relaxed">
            O cronograma abaixo é da edição mais recente já confirmada em edital pelo Cebraspe. Cada nova edição sai com
            datas próprias — sempre confira o edital vigente em{' '}
            <a href="https://www.cebraspe.org.br/vestibulares/" target="_blank" rel="noreferrer" className="underline font-semibold">
              cebraspe.org.br/vestibulares
            </a>.
          </p>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <dt className="font-bold text-[#4f46e5] dark:text-[#818CF8]">Inscrições</dt>
            <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">15 de agosto a 5 de setembro</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <dt className="font-bold text-[#4f46e5] dark:text-[#818CF8]">Pagamento da taxa (R$ 173)</dt>
            <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Até 25 de setembro</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <dt className="font-bold text-[#4f46e5] dark:text-[#818CF8]">1º dia de prova</dt>
            <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Prova I (30 itens) + Prova II (120 itens) + Redação — até 5h de duração</dd>
          </div>
          <div className="p-4 rounded-xl bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554]">
            <dt className="font-bold text-[#4f46e5] dark:text-[#818CF8]">2º dia de prova</dt>
            <dd className="text-[#475569] dark:text-[#e1e2ec] mt-1">Prova III (150 itens) — até 5h de duração</dd>
          </div>
        </dl>
        <p className="text-xs text-[#a0a3af] dark:text-[#908fa0]">
          Isenção de taxa disponível pra quem está no CadÚnico ou tem renda per capita de até 1,5 salário mínimo,
          cursando ensino médio em escola pública ou como bolsista integral.
        </p>
      </section>
    </div>
  )

  return <UniversityBasePage slug="cebraspe" customContent={customContent} />
}
