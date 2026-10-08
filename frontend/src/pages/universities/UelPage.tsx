import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function UelPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Universidade pública estadual — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">
        UEL: um campus só, 235 hectares, referência do norte do Paraná
      </h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8 max-w-2xl">
        A Universidade Estadual de Londrina fica em Londrina (PR) e nasceu em 1970 por iniciativa de lideranças
        locais que viam o ensino superior como alavanca de desenvolvimento pra região norte do estado. Diferente de
        universidades como UDESC ou PUC Minas, a UEL não é multicampi: toda a estrutura acadêmica está concentrada
        num único campus universitário de 235 hectares, o que facilita a vida em comunidade acadêmica bem integrada.
      </p>

      <CampusImage
        variant="float-right"
        src="https://upload.wikimedia.org/wikipedia/commons/a/ad/Londrina_-_UEL.jpg"
        alt="Vista geral do campus da Universidade Estadual de Londrina, com prédios acadêmicos e áreas verdes"
        caption="Campus da UEL, Londrina"
        credit="Foto: Luís Guilherme Fernandes Pereira / Wikimedia Commons, CC BY 2.0"
      />

      {/* Grade de números-chave, estilo diferente das outras páginas (sem tags de curso nem timeline) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="text-center">
          <div className="text-2xl font-extrabold text-slate-600 dark:text-slate-400">1970</div>
          <div className="text-[11px] text-[#64748B] dark:text-slate-300 mt-1">Ano de fundação</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-extrabold text-slate-600 dark:text-slate-400">9</div>
          <div className="text-[11px] text-[#64748B] dark:text-slate-300 mt-1">Centros de Estudo</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-extrabold text-slate-600 dark:text-slate-400">53</div>
          <div className="text-[11px] text-[#64748B] dark:text-slate-300 mt-1">Cursos de graduação</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-extrabold text-slate-600 dark:text-slate-400">191</div>
          <div className="text-[11px] text-[#64748B] dark:text-slate-300 mt-1">Cursos de pós-graduação</div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-10">
        Entre as áreas mais concorridas estão <strong>Medicina</strong>, <strong>Direito</strong>,{' '}
        <strong>Odontologia</strong>, <strong>Engenharia Civil</strong> e <strong>Agronomia</strong> — um perfil que
        reflete tanto a importância histórica da UEL em saúde quanto a força do agronegócio na região de Londrina.
      </p>

      {/* Bloco de diferencial em destaque, único formato entre os já usados */}
      <div className="rounded-2xl border-l-4 border-green-600 dark:border-green-500 bg-green-50 dark:bg-green-950/20 p-5 mb-10">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: um dos poucos vestibulares que ainda resiste ao SiSU
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          Enquanto boa parte das federais e estaduais migrou o grosso das vagas pro SiSU, a UEL mantém o{' '}
          <strong>vestibular próprio como via principal de ingresso</strong>, reservando o ENEM praticamente só para
          vagas remanescentes. A universidade também é reconhecida internacionalmente pelo impacto de suas pesquisas
          — no ranking Times Higher Education, aparece entre as três melhores do Paraná, sendo a{' '}
          <strong>1ª pública estadual do estado</strong>.
        </p>
      </div>

      {/* Linha de processo seletivo em formato compacto (dias de prova), reaproveitando ideia de "linha única" mas com conteúdo próprio */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Como funciona o vestibular</h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed mb-4">
          Desde a reestruturação aprovada em dezembro de 2024, o processo seletivo da UEL foi concentrado numa única
          fase, aplicada em dois dias consecutivos — organizada pela COPS (Coordenadoria de Processos Seletivos).
          Existem vagas por ampla concorrência e reserva específica para candidatos negros autodeclarados oriundos de
          escola pública.
        </p>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm border-y border-[#E2E8F0] dark:border-[#464554] py-4">
          <div><span className="font-bold text-slate-600 dark:text-slate-400">Prova de Habilidades Específicas: </span>1 dia (cursos que exigem)</div>
          <div><span className="font-bold text-slate-600 dark:text-slate-400">Dia 1 do vestibular geral: </span>Conhecimentos Gerais + Redação</div>
          <div><span className="font-bold text-slate-600 dark:text-slate-400">Dia 2 do vestibular geral: </span>Conhecimentos Específicos</div>
        </div>
        <p className="text-xs text-[#a0a3af] dark:text-[#908fa0] mt-3">
          Inscrição exclusivamente online, pelo site da COPS. Datas e vagas mudam a cada edital — confirme sempre em{' '}
          <a href="https://www.cops.uel.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            cops.uel.br
          </a>.
        </p>
      </div>

      <CampusImage
        variant="corner-badge"
        src="https://upload.wikimedia.org/wikipedia/commons/0/0d/Analisador_de_Baterias.jpg"
        alt="Analisador de baterias desenvolvido por pesquisadores da UEL, equipamento de laboratório usado em pesquisa aplicada"
        caption="Equipamento de laboratório desenvolvido por pesquisadores da UEL"
        credit="Foto: Adam Esteves Debiasi / Wikimedia Commons, CC BY-SA 3.0"
      />
    </div>
  )

  return <UniversityBasePage slug="uel" customContent={customContent} />
}
