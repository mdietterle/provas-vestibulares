import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function UfpePage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Pública federal — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">UFPE: da sala de aula ao maior polo de tecnologia do Nordeste</h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8 max-w-2xl">
        Com sede em Recife e mais dois campi — Caruaru (Centro Acadêmico do Agreste) e Vitória de Santo Antão
        (Centro Acadêmico de Vitória) —, a UFPE é uma das principais federais do Nordeste, com 106 cursos de
        graduação distribuídos entre as três unidades.
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/1/10/Centro_de_Artes_e_Comunica%C3%A7%C3%A3o_da_Universidade_Federal_de_Pernambuco.jpg"
        alt="Centro de Artes e Comunicação da Universidade Federal de Pernambuco, em Recife"
        caption="Centro de Artes e Comunicação, campus Recife"
        credit="Foto: Rolejarg / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 my-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: o Porto Digital nasceu dentro da UFPE
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          O <strong>Porto Digital</strong>, um dos maiores polos de tecnologia do Brasil, nasceu dentro do{' '}
          <strong>Centro de Informática (CIn/UFPE)</strong> e nunca deixou de estar ligado à universidade — empresas
          como a In Loco Media surgiram diretamente de trabalhos acadêmicos do CIn. O setor de TI, que representava
          apenas 0,8% do PIB de Pernambuco em 2000, chegou a 4,8% em 2008, em boa parte graças a essa articulação
          entre universidade, governo e iniciativa privada. É um caso raro de universidade pública virando
          literalmente a origem de um ecossistema de startups regional.
        </p>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8">
        A UFPE mantém <strong>nota 4 no IGC/MEC</strong>, e no Enade 2023, <strong>14 dos 22 cursos avaliados (63%)
        tiraram nota máxima (5)</strong> — incluindo Engenharia de Alimentos (2º melhor do Brasil na área) e
        Medicina em Recife (3º melhor do país, a melhor entre federais). Outros cursos de destaque incluem{' '}
        <strong>Direito</strong>, <strong>Ciência da Computação</strong>, <strong>Odontologia</strong> e{' '}
        <strong>Arquitetura e Urbanismo</strong>.
      </p>

      <CampusImage
        variant="polaroid-tilt"
        src="https://upload.wikimedia.org/wikipedia/commons/c/ce/Faculdade_de_Direito_da_Universidade_Federal_de_Pernambuco_10.jpg"
        alt="Faculdade de Direito da Universidade Federal de Pernambuco"
        caption="Faculdade de Direito, UFPE"
        credit="Foto: Dantadd / Wikimedia Commons, CC BY-SA 2.5"
      />

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Papel no desenvolvimento de Pernambuco
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          Além do impacto direto do Porto Digital, os campi de Caruaru e Vitória de Santo Antão levaram ensino
          federal gratuito pro interior pernambucano — regiões que historicamente dependiam só de faculdades
          privadas ou de deslocamento até Recife. Isso ajuda a fixar profissionais qualificados em cidades do
          Agreste e da Zona da Mata, ao mesmo tempo em que a capital consolida seu papel de polo tecnológico e de
          saúde de referência nacional.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] mb-2">
          Ingresso: SiSU (com exceções pra cursos específicos)
        </h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A maior parte das vagas é preenchida via <strong>SiSU</strong> (nota do ENEM). Um vestibular próprio
          existe só pra cursos que exigem habilidade específica — <strong>Dança</strong>, <strong>Música</strong> e{' '}
          <strong>Letras-Libras</strong> — além de cursos EaD e processos seletivos extravestibular pontuais.
          Confirme sempre em{' '}
          <a href="https://www.ufpe.br/formas-de-ingresso" target="_blank" rel="noreferrer" className="underline font-semibold">
            ufpe.br/formas-de-ingresso
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufpe" customContent={customContent} />
}
