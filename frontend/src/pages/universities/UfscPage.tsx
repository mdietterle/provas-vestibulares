import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

export default function UfscPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <CampusImage
        variant="reveal-wide"
        src="https://upload.wikimedia.org/wikipedia/commons/a/ac/Pr%C3%A9dio_da_Reitoria_-_Universidade_Federal_de_Santa_Catarina_%28UFSC%29.JPG"
        alt="Prédio da Reitoria da Universidade Federal de Santa Catarina, no campus Trindade, Florianópolis"
        caption="Reitoria da UFSC, campus Trindade"
        credit="Foto: Airtonjordani / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4 mt-6">
        Pública federal — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">UFSC: única nota 5 do estado no IGC/MEC</h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8 max-w-2xl">
        Com sede no campus Trindade, em Florianópolis, e mais quatro campi (Araranguá, Blumenau, Curitibanos e
        Joinville), a UFSC é a 4ª melhor universidade pública do Brasil segundo o Índice Geral de Cursos do INEP —
        e a única instituição catarinense com nota máxima nesse indicador.
      </p>

      <div className="rounded-2xl border-l-4 border-slate-500 dark:border-slate-400 bg-slate-50 dark:bg-slate-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: único vestibular unificado com dois institutos federais
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          O vestibular próprio da UFSC, organizado pela COPERVE, é aplicado de forma <strong>unificada com o
          IFSC e o IFC</strong> (institutos federais catarinenses) — um arranjo raro no país, em que três
          instituições diferentes compartilham o mesmo processo seletivo e sistema de pontuação por curso.
        </p>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8">
        A universidade tem cerca de 29 mil estudantes de graduação em mais de 120 cursos. As maiores notas de corte
        são em <strong>Medicina</strong>, <strong>Engenharia Química</strong> e <strong>Engenharia Mecânica</strong> —
        a Engenharia Elétrica da UFSC ficou em 6º lugar nacional e a Mecânica em 4º, no QS World University
        Rankings by Subject 2026.
      </p>

      <div className="border-t border-[#E2E8F0] dark:border-[#464554] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Ingresso: vestibular unificado ou SiSU
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          O SiSU segue o calendário nacional, com inscrições no início do ano. O vestibular unificado UFSC/IFSC/IFC
          costuma sair em edital no segundo semestre, pra ingresso no ano seguinte. Confirme sempre em{' '}
          <a href="https://coperve.ufsc.br/" target="_blank" rel="noreferrer" className="underline font-semibold">
            coperve.ufsc.br
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="ufsc" customContent={customContent} />
}
