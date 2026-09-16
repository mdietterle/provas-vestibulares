import UniversityBasePage from './UniversityBasePage'
import CampusImage from '../../components/CampusImage'

const REGIOES = [
  {
    nome: 'Belo Horizonte',
    vagas: '5.445 vagas em 65 cursos',
    unidades: 'Barreiro, Coração Eucarístico, Lourdes, São Gabriel',
  },
  {
    nome: 'Região Metropolitana',
    vagas: 'Unidades complementares',
    unidades: 'Contagem, Betim',
  },
  {
    nome: 'Interior de Minas',
    vagas: '1.180 vagas em 18 cursos',
    unidades: 'Arcos, Poços de Caldas, Serro, Guanhães',
  },
]

export default function PucminasPage() {
  const customContent = (
    <div className="mb-12 font-sans text-[#2d3748] dark:text-[#cbd5e1]">
      <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-2">Sete cidades, uma só universidade</h2>
      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8 max-w-2xl">
        A PUC Minas é uma das maiores universidades privadas do Brasil em oferta de vagas, mantida pela Rede Marista.
        Em vez de se concentrar numa única cidade, espalhou unidades por sete municípios mineiros — uma estrutura
        que vale a pena entender em camadas, de dentro pra fora da capital.
      </p>

      <CampusImage
        variant="polaroid-tilt"
        src="https://upload.wikimedia.org/wikipedia/commons/b/b4/Entradapucminas.jpg"
        alt="Entrada do campus Coração Eucarístico da PUC Minas, em Belo Horizonte"
        caption="Entrada do campus Coração Eucarístico, Belo Horizonte"
        credit="Foto: Andrevruas / Wikimedia Commons, CC BY-SA 4.0"
      />

      {/* Lista agrupada por região geográfica, estilo "acordeão expandido" — bem diferente do card/tabela usado nas outras páginas */}
      <div className="mb-10 space-y-4">
        {REGIOES.map((r, i) => (
          <div key={r.nome} className="rounded-2xl border border-[#E2E8F0] dark:border-[#1e2d4a] overflow-hidden">
            <div className="bg-[#F4F6F9] dark:bg-[#1a2542] px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#2563EB] dark:bg-[#6366F1] text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="font-bold text-[#1E293B] dark:text-white">{r.nome}</span>
              </div>
              <span className="text-xs font-semibold text-[#6366F1] dark:text-[#818CF8]">{r.vagas}</span>
            </div>
            <div className="px-5 py-3 text-sm text-[#475569] dark:text-[#94a3b8]">
              Unidades: {r.unidades}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm leading-relaxed text-[#475569] dark:text-[#94a3b8] mb-8">
        No total são mais de 150 cursos de graduação e pós-graduação e cerca de 7.175 vagas por ciclo, considerando
        todas as unidades — com destaque histórico em <strong>Medicina</strong>, <strong>Engenharia Civil</strong> e{' '}
        <strong>Direito</strong>, cursos que tradicionalmente concentram a maior concorrência da instituição.
      </p>

      <CampusImage
        variant="diagonal-strip"
        src="https://upload.wikimedia.org/wikipedia/commons/9/95/Bibliotecapucminas1.jpg"
        alt="Biblioteca do campus Coração Eucarístico da PUC Minas, com salas de estudo e acervo"
        caption="Biblioteca do campus Coração Eucarístico"
        credit="Foto: Andrevruas / Wikimedia Commons, CC BY-SA 4.0"
      />

      <div className="border-t border-[#E2E8F0] dark:border-[#1e2d4a] pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#6366F1] dark:text-[#818CF8] mb-2">Como entrar</h3>
        <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed">
          A PUC Minas realiza <strong>dois vestibulares próprios por ano</strong>, além de aceitar a nota do ENEM em
          todos os campi e unidades — dando mais de uma chance por ciclo letivo pra quem quer entrar. Datas variam por
          edição; confirme sempre em{' '}
          <a href="https://www.pucminas.br/vestibular/" target="_blank" rel="noreferrer" className="underline font-semibold">
            pucminas.br/vestibular
          </a>.
        </p>
      </div>
    </div>
  )

  return <UniversityBasePage slug="pucminas" customContent={customContent} />
}
