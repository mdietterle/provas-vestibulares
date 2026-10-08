import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function UfpelPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <blockquote className="border-l-4 border-amber-500 pl-5 italic text-lg text-[#1E293B] dark:text-white mb-6">
        "A escola de Agronomia mais antiga do Brasil segue funcionando dentro de uma universidade federal gaúcha."
      </blockquote>

      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
        Pública federal — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">UFPel: tradição centenária em ciências agrárias</h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8 max-w-2xl">
        A Universidade Federal de Pelotas foi oficialmente criada em 1969, a partir da transformação da antiga
        Universidade Federal Rural do Rio Grande do Sul — reunindo escolas que já existiam havia décadas, como a
        centenária Faculdade de Agronomia Eliseu Maciel, a Faculdade de Veterinária e a Faculdade de Ciências
        Domésticas, somadas depois às Faculdades de Direito e Odontologia.
      </p>

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: a mais antiga escola de Agronomia do país
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          O campus de Capão do Leão abriga a FAEM, a <strong>escola de Agronomia mais antiga do Brasil</strong> —
          fundada décadas antes da própria UFPel existir como universidade. É lá também que fica a Faculdade de
          Veterinária, formando um polo agropecuário histórico raro entre universidades federais brasileiras.
        </p>
      </div>

      <CampusImage
        variant="corner-badge"
        src="https://upload.wikimedia.org/wikipedia/commons/3/36/UFPel.JPG"
        alt="Prédio da Universidade Federal de Pelotas"
        caption="Prédio da UFPel"
        credit="Foto: Eugenio Hansen, OFS / Wikimedia Commons, CC BY-SA 3.0"
      />

      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8">
        Hoje a UFPel tem 22 unidades acadêmicas e oferece 103 cursos de graduação presenciais, além de 26
        doutorados, 50 mestrados e 34 especializações. Além de Agronomia e Veterinária, se destaca em{' '}
        <strong>Medicina</strong>, <strong>Odontologia</strong> e <strong>Direito</strong>.
      </p>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 dark:text-teal-400 mb-2">Campi e unidades</h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          Além do Campus Capão do Leão (agrário) e do Campus Porto (centro histórico), a universidade tem unidades
          espalhadas pela cidade de Pelotas e mantém o Centro Agropecuário da Palma, na BR-116 — uma estrutura de
          campo essencial pras práticas de Agronomia e Veterinária.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#464554] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 dark:text-teal-400 mb-2">
          Ingresso: SiSU + processos especiais
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          O ingresso é majoritariamente via <strong>SiSU</strong> (nota do ENEM). A universidade também mantém
          processos seletivos especiais próprios pra quilombolas, indígenas e o PARFOR (formação de professores em
          exercício), ampliando o acesso pra públicos que o SiSU tradicional não alcança bem. Confirme editais em{' '}
          <a href="https://portal.ufpel.edu.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            portal.ufpel.edu.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufpel" customContent={customContent} />
}
