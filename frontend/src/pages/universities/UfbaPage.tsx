import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function UfbaPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Pública federal — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">UFBA: a maior universidade da Bahia</h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8 max-w-2xl">
        Fundada em 1946 a partir da reunião de escolas já centenárias — Medicina, Odontologia, Farmácia, Direito,
        Filosofia, Economia e a Escola Politécnica —, a UFBA tem sede em Salvador, com campus adicional em Vitória
        da Conquista. É a maior instituição de ensino superior do estado.
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/a/af/Fachada_do_Pal%C3%A1cio_da_Reitoria_da_Universidade_Federal_da_Bahia.jpg"
        alt="Fachada do Palácio da Reitoria da Universidade Federal da Bahia, em Salvador"
        caption="Palácio da Reitoria da UFBA, Salvador"
        credit="Foto: Guimarães Mota / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="rounded-2xl border-l-4 border-slate-500 dark:border-slate-400 bg-slate-50 dark:bg-slate-950/20 p-5 my-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Avaliação MEC: nota máxima no recredenciamento institucional
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          A UFBA obteve <strong>nota máxima (5) no recredenciamento institucional</strong> do INEP/MEC — a avaliação
          mais ampla que existe, olhando pra universidade inteira. No Enade 2023, <strong>85% dos cursos de
          graduação</strong> foram avaliados com conceito 4 ou 5. A universidade também alcançou conceito máximo na
          modalidade de Educação a Distância (EAD), reforçando consistência entre presencial e EaD.
        </p>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8">
        Em Salvador, a UFBA concentra a maior parte dos cursos, cobrindo humanas, exatas, biológicas e artes. O
        campus de Vitória da Conquista é voltado a cursos de saúde — <strong>Medicina</strong>,{' '}
        <strong>Enfermagem</strong>, <strong>Farmácia</strong> e Biotecnologia — levando formação médica pro
        interior baiano, não só pra capital. Outros cursos de destaque incluem <strong>Direito</strong>,{' '}
        <strong>Odontologia</strong>, <strong>Arquitetura e Urbanismo</strong> e <strong>Psicologia</strong>.
      </p>

      <CampusImage
        variant="polaroid-tilt"
        src="https://upload.wikimedia.org/wikipedia/commons/0/08/Biblioteca_em_Constru%C3%A7%C3%A3o%2C_Hospital_Universit%C3%A1rio_e_PA_da_FAMEDUFBa_%284758192330%29.jpg"
        alt="Hospital Universitário e biblioteca da Faculdade de Medicina da Bahia (FAMEDUFBa)"
        caption="Hospital Universitário, Faculdade de Medicina da UFBA"
        credit="Foto: Samory Pereira Santos / Wikimedia Commons, CC BY-SA 2.0"
      />

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Papel no desenvolvimento da Bahia
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          Como maior universidade do estado, a UFBA concentra boa parte da pesquisa científica e da formação de
          médicos, engenheiros e profissionais de humanas produzida na Bahia — um papel estratégico numa região
          historicamente carente de investimento federal em ciência e tecnologia se comparada ao Sul e Sudeste. A
          presença em Vitória da Conquista, no interior, também ajuda a descentralizar o acesso ao ensino superior
          público de qualidade, reduzindo a dependência exclusiva de Salvador.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#464554] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Ingresso: SiSU
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          O ingresso na UFBA é feito <strong>majoritariamente via SiSU</strong>, com a nota do ENEM, seguindo o
          calendário nacional definido pelo MEC. Confirme sempre datas e vagas em{' '}
          <a href="https://ingresso.ufba.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            ingresso.ufba.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufba" customContent={customContent} />
}
