import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const NUMEROS = [
  { valor: '154', rotulo: 'cursos de graduação' },
  { valor: '12', rotulo: 'campi' },
  { valor: '82', rotulo: 'municípios alcançados' },
  { valor: '3', rotulo: 'hospitais universitários' },
]

export default function UfpaPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#E2E8F0] dark:bg-[#1e2d4a] rounded-2xl overflow-hidden mb-8 border border-[#E2E8F0] dark:border-[#1e2d4a]">
        {NUMEROS.map(n => (
          <div key={n.rotulo} className="bg-white dark:bg-[#151f38] p-4 text-center">
            <div className="text-2xl font-extrabold text-[#4f46e5] dark:text-[#818CF8]">{n.valor}</div>
            <div className="text-[11px] text-[#64748B] dark:text-[#94a3b8] mt-1">{n.rotulo}</div>
          </div>
        ))}
      </div>

      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Pública federal — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        A maior e mais antiga federal da região Norte
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8 max-w-2xl">
        Com sede em Belém, a UFPA é a maior universidade federal do Norte do Brasil, presente em 12 campi que
        alcançam 82 municípios paraenses. É a principal formadora de profissionais pra uma região continental, com
        papel central em áreas como Genética, Geociências e Neurociências.
      </p>

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: líder amazônica em patentes registradas
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A UFPA lidera a região amazônica em quantidade de patentes registradas no INPI (Instituto Nacional de
          Propriedade Industrial) — um indicador raro de conversão de pesquisa acadêmica em inovação registrada,
          numa região historicamente carente de infraestrutura de ciência e tecnologia.
        </p>
      </div>

      <CampusImage
        variant="float-right"
        src="https://upload.wikimedia.org/wikipedia/commons/5/58/UFPA_-_Campus_Bel%C3%A9m.jpg"
        alt="Campus da Universidade Federal do Pará, em Belém"
        caption="Campus Guamá da UFPA, Belém"
        credit="Foto: Túllio F / Wikimedia Commons, CC BY-SA 4.0"
      />

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8">
        São 100 mestrados e 55 doutorados, além de 1.021 grupos de pesquisa e 622 programas de extensão em
        atividade — números que colocam a UFPA entre as maiores estruturas de pós-graduação e extensão do país.
        Cursos de destaque incluem <strong>Medicina</strong>, <strong>Direito</strong>, <strong>Psicologia</strong> e{' '}
        <strong>Engenharias</strong>.
      </p>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Avaliação MEC: Direito e Psicologia nota máxima no Enade
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          No Enade 2022, <strong>Direito</strong> e <strong>Psicologia</strong> tiraram nota máxima (5), enquanto
          Administração, Ciências Contábeis, Jornalismo, Publicidade e Propaganda, Serviço Social e Turismo
          alcançaram conceito 4. Cursos como Engenharia de Exploração e Produção de Petróleo e Gás (Salinópolis)
          também vêm subindo de nota nas últimas avaliações — um sinal de que a UFPA melhora de forma consistente
          mesmo em unidades no interior do estado, não só na capital.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Papel no desenvolvimento da Amazônia
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A UFPA é a maior instituição de ensino, pesquisa e extensão da Amazônia, presente em municípios que
          dificilmente teriam acesso a ensino superior público de outra forma. Isso é especialmente relevante numa
          região com dimensões continentais e infraestrutura de transporte limitada: cada campus no interior
          (Salinópolis, Cametá, Altamira, Castanhal, entre outros) reduz a necessidade de famílias inteiras migrarem
          pra Belém em busca de formação superior, fixando conhecimento e mão de obra qualificada direto nas
          cidades da região.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Ingresso: só pelo SiSU
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          Diferente de várias federais que mantêm vestibular próprio, a UFPA usa <strong>exclusivamente a nota do
          ENEM</strong> desde 2014, através do PS UFPA, organizado pelo CEPS/UFPA. Não há prova própria — toda a
          seleção segue o calendário nacional do SiSU. Confirme datas e vagas em{' '}
          <a href="https://www.ceps.ufpa.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            ceps.ufpa.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufpa" customContent={customContent} />
}
