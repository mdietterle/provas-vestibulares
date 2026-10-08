import { useState } from 'react'
import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const MODALIDADES = [
  { id: 'proprio', nome: 'Vestibular próprio', texto: 'Prova elaborada e aplicada pela própria PUC-Rio, com processo principal (Verão) e complementar (Inverno).' },
  { id: 'enem', nome: 'Nota do ENEM', texto: 'Aceita nota de múltiplas edições do exame nacional como forma de ingresso direto, sem prova adicional.' },
  { id: 'abitur', nome: 'Abitur', texto: 'Reconhece o diploma de ensino médio alemão como via de acesso, refletindo a vocação internacional da universidade.' },
  { id: 'bac', nome: 'Baccalauréat', texto: 'Aceita também o diploma de ensino médio francês, mesma lógica do Abitur — sem repetir vestibular brasileiro.' },
]

export default function PucrioPage() {
  const [ativo, setAtivo] = useState(MODALIDADES[0].id)
  const selecionado = MODALIDADES.find(m => m.id === ativo)!

  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#e1e2ec]">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white">A universidade privada mais internacional do Brasil</h2>
      </div>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-8 max-w-2xl">
        Fundada em 1941 no campus da Gávea, no Rio de Janeiro, a PUC-Rio está entre as 5 melhores universidades do país
        e lidera o ranking QS de universidades privadas brasileiras. Um sinal claro dessa vocação internacional: é uma
        das poucas instituições do país que aceita diplomas de ensino médio estrangeiros como via direta de ingresso.
      </p>

      <CampusImage
        variant="reveal-wide"
        src="https://www.puc-rio.br/sobrepuc/campus/imagens/img_campus_banner_index.jpg"
        alt="Campus Gávea da PUC-Rio, no Rio de Janeiro, com vista dos edifícios acadêmicos entre a vegetação da cidade"
        caption="Campus Gávea, PUC-Rio"
        credit="Imagem: divulgação PUC-Rio (puc-rio.br)"
      />

      {/* Seletor de abas (tabs) pras 4 modalidades de ingresso — formato interativo, único entre as páginas de universidade */}
      <div className="mb-10">
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 dark:text-teal-400 mb-3">4 formas de entrar — clique pra ver cada uma</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {MODALIDADES.map(m => (
            <button
              key={m.id}
              onClick={() => setAtivo(m.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                ativo === m.id
                  ? 'bg-teal-600 dark:bg-amber-500 text-white border-transparent'
                  : 'bg-white dark:bg-[#191b23] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#464554] hover:border-amber-500'
              }`}
            >
              {m.nome}
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#464554] bg-white dark:bg-[#191b23] p-5">
          <div className="text-base font-bold text-[#1E293B] dark:text-white mb-1">{selecionado.nome}</div>
          <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">{selecionado.texto}</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 mb-6">
        São 36 cursos de graduação distribuídos em 4 grandes centros acadêmicos (Teologia e Ciências Humanas, Ciências
        Sociais, Estudos Técnico-Científicos, e Ciências Biológicas e Médicas), com tradição forte em{' '}
        <strong>Direito</strong>, <strong>Engenharia</strong> e <strong>Administração</strong>. Em 2024, a
        universidade anunciou a criação de um Instituto de Inteligência Artificial com curso de graduação próprio —
        sinal de que a instituição segue expandindo pra áreas de fronteira tecnológica.
      </p>

      <div className="rounded-2xl border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 mb-6">
        <h3 className="font-bold text-base text-[#1E293B] dark:text-white mb-2">
          Parceria de 30 anos com a Petrobras
        </h3>
        <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
          O <strong>Instituto Tecgraf</strong>, laboratório de computação gráfica da PUC-Rio, colabora há mais de 30
          anos com a Petrobras — um caso raro de parceria universidade-indústria sustentada por décadas no Brasil.
          Um dos projetos recentes usa inteligência artificial pra identificar reservas de gás natural em parceria
          com a Eneva, elevando a taxa de sucesso de identificação pra 70%. Esse tipo de colaboração ajuda a
          explicar por que a PUC-Rio ocupa o 4º lugar do Brasil no indicador de Parceria Universidade-Indústria do
          Times Higher Education, que também já elegeu a instituição como melhor universidade privada do país.
        </p>
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-slate-300">
        Confirme datas e requisitos de cada modalidade em{' '}
        <a href="https://www.puc-rio.br/vestibular/" target="_blank" rel="noreferrer" className="underline font-semibold">
          puc-rio.br/vestibular
        </a>.
      </p>
    </div>
  )

  return <UniversityBasePage slug="pucrio" customContent={customContent} />
}
