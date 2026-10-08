import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const CAMPI = ['Curitiba (Centro e Ecoville)', 'Apucarana', 'Campo Mourão', 'Cornélio Procópio', 'Dois Vizinhos', 'Francisco Beltrão', 'Guarapuava', 'Londrina', 'Medianeira', 'Pato Branco', 'Ponta Grossa', 'Santa Helena', 'Toledo']

export default function UtfprPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <CampusImage
        variant="diagonal-strip"
        src="https://upload.wikimedia.org/wikipedia/commons/3/31/Universidade_Tecnol%C3%B3gica_Federal_do_Paran%C3%A1_%28Campus_Corn%C3%A9lio_Proc%C3%B3pio%29_15.jpg"
        alt="Campus da UTFPR em Cornélio Procópio, Paraná"
        caption="Campus da UTFPR, Cornélio Procópio"
        credit="Foto: Eugenio Hansen, OFS / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4 mt-6">
        Pública federal — sem mensalidade
      </div>
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">UTFPR: a única universidade tecnológica federal do Brasil</h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8 max-w-2xl">
        Transformada em universidade em 2005, a partir do antigo CEFET-PR, a UTFPR se inspira no modelo europeu de
        universidade politécnica — combinando ensino técnico, tecnólogo, bacharelado, licenciatura e pós-graduação
        na mesma instituição.
      </p>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 dark:text-teal-400 mb-2">O maior número de campi entre as universidades citadas aqui</h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed mb-3">
          São 13 cidades paranaenses com unidade da UTFPR — cada campus com oferta de curso planejada conforme a
          vocação econômica local:
        </p>
        <div className="flex flex-wrap gap-2">
          {CAMPI.map(c => (
            <span key={c} className="text-xs font-semibold text-teal-600 dark:text-teal-400 bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554] rounded-full px-3 py-1">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 mb-8">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Diferencial: primeiro mestrado e doutorado em Engenharia Elétrica do Paraná
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          A UTFPR foi responsável pelo <strong>primeiro mestrado em Engenharia Elétrica do estado</strong> e,
          depois, pelo <strong>único doutorado na área no Paraná</strong> — reflexo de uma identidade construída em
          torno de tecnologia e engenharia, diferente do perfil generalista da maioria das universidades federais.
        </p>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-10">
        São 48 cursos de graduação em três modalidades: tecnologia, bacharelado e licenciatura — com forte
        incentivo ao empreendedorismo e trabalho paralelo com o ensino técnico. Áreas mais fortes incluem{' '}
        <strong>Engenharia Elétrica</strong>, <strong>Engenharia Mecânica</strong>,{' '}
        <strong>Engenharia de Computação</strong> e <strong>Ciência da Computação</strong>.
      </p>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 dark:text-teal-400 mb-2">
          Avaliação MEC: a instituição com mais cursos nota máxima no Enade
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          A UTFPR já foi apontada como a <strong>instituição com mais cursos nota máxima no Enade</strong> do
          Brasil. Só no campus Curitiba, 7 cursos tiraram nota 5 — Arquitetura e Urbanismo, Engenharia Ambiental e
          Sanitária, Engenharia Civil, Engenharia de Computação, Engenharia de Controle e Automação, Engenharia
          Mecânica e Tecnologia em Radiologia. A Engenharia de Computação da UTFPR Curitiba ficou em{' '}
          <strong>4º lugar nacional</strong>, atrás só de ITA, IME e PUC-Rio — a melhor entre as federais do país.
          Outros campi também têm cursos nota máxima: Engenharia de Alimentos (Francisco Beltrão), Engenharia
          Elétrica (Ponta Grossa) e Engenharia Química (Londrina).
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 dark:text-teal-400 mb-2">
          Papel no desenvolvimento tecnológico do Paraná
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          Com 13 campi espalhados pelo estado, a missão declarada da UTFPR é oferecer curso de engenharia de
          referência tanto pra capital quanto pro interior e sudoeste paranaense — regiões que, sem uma federal
          tecnológica local, dependeriam de deslocar estudantes até Curitiba ou pra fora do estado. Isso ajuda a
          reter talento técnico nas cidades-polo (Pato Branco, Medianeira, Toledo) e alimenta diretamente a
          indústria regional com engenheiros formados perto de onde vão trabalhar.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] dark:border-[#464554] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 dark:text-teal-400 mb-2">
          Ingresso: vestibular próprio
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          O vestibular é aplicado com prova objetiva anual, e o candidato pode escolher até duas opções de curso na
          mesma inscrição. Também existem outras formas de ingresso complementares. Confirme sempre em{' '}
          <a href="https://www.utfpr.edu.br/cursos/estudenautfpr/vestibular/vestibular" target="_blank" rel="noreferrer" className="underline font-semibold">
            utfpr.edu.br/vestibular
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="utfpr" customContent={customContent} />
}
