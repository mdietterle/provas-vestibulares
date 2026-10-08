import { Link } from 'react-router-dom'
import { UNIVERSITIES, CATEGORY_LABELS, REGION_LABELS, type University, type UniversityCategory, type Region } from '../data/universities'
import AdSlot from '../components/AdSlot'
import Seo from '../components/Seo'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'
import Breadcrumb from '../components/Breadcrumb'

const ADSENSE_SLOT_PUBLIC = (import.meta.env.VITE_ADSENSE_SLOT_PUBLIC as string | undefined) || ''

const CATEGORY_ORDER: UniversityCategory[] = ['exame_nacional', 'federal', 'estadual', 'particular']
const REGION_ORDER: Region[] = ['Nacional', 'Sudeste', 'Sul', 'Nordeste', 'Centro-Oeste', 'Norte']

function UniversityCard({ u }: { u: University }) {
  return (
    <Link
      to={`/universidades/${u.slug}`}
      className="block rounded-xl border border-[#E2E8F0] p-4 bg-white hover:border-amber-500 dark:hover:border-teal-400 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="font-display font-bold text-[#1E293B]">{u.shortName}</h3>
        <span className="text-[10px] uppercase font-bold text-[#a0a3af] dark:text-[#908fa0] tracking-wider">{u.state}</span>
      </div>
      <p className="text-xs text-[#64748B] leading-relaxed line-clamp-2">{u.vestibularType}</p>
      {u.hasRealImporter && (
        <span className="inline-block mt-2 text-[10px] font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-full px-2 py-0.5">
          Provas reais no banco
        </span>
      )}
    </Link>
  )
}

export default function UniversitiesIndexPage() {
  const byCategory = CATEGORY_ORDER.map(cat => ({
    category: cat,
    items: UNIVERSITIES.filter(u => u.category === cat),
  })).filter(g => g.items.length > 0)

  const byRegion = REGION_ORDER.map(region => ({
    region,
    items: UNIVERSITIES.filter(u => u.region === region && u.category !== 'exame_nacional'),
  })).filter(g => g.items.length > 0)

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#10131a] font-sans">
      <Seo
        title={`Vestibulares e universidades no Brasil (${UNIVERSITIES.length} instituições) — calendário e cursos | Cognition AI`}
        description={`Guia com calendário, tipo de prova e cursos mais procurados de ${UNIVERSITIES.length} vestibulares brasileiros, incluindo ENEM, FUVEST, ITA, UFPR, UFRGS e mais.`}
        path="/universidades"
      />
      <PublicHeader />

      <div className="max-w-6xl mx-auto px-6 py-14">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Universidades' }]} />
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="font-display text-3xl font-bold text-[#1E293B] mb-3">Universidades e vestibulares</h1>
          <p className="text-sm mb-1">
            <Link to="/calendario" className="text-amber-500 dark:text-teal-400 hover:underline font-semibold">
              Ver calendário das próximas provas →
            </Link>
          </p>
          <p className="text-[#64748B] leading-relaxed mb-4">
            O Cognition AI monta simulados a partir de provas e gabaritos publicados oficialmente pelas
            próprias bancas organizadoras. Reunimos aqui informações sobre o tipo de vestibular, calendário
            típico e principais cursos de cada instituição cujo banco de questões fazemos parte do sistema.
          </p>
          <p className="text-[#64748B] leading-relaxed">
            Vale notar que não existe um "modelo único" de vestibular no Brasil: exames nacionais como o ENEM
            dão acesso a milhares de instituições via SiSU, vestibulares unificados como o da ACAFE reúnem
            várias faculdades numa prova só, e universidades como USP, UFPR ou UFRGS mantêm processos próprios
            com fases e critérios bem diferentes entre si. Use os filtros por tipo de instituição e por região
            abaixo pra comparar rapidamente como cada prova funciona antes de escolher onde focar os estudos.
          </p>
        </div>

        <section className="mb-14">
          <h2 className="font-display text-xl font-bold text-[#1E293B] mb-5">Por tipo de instituição</h2>
          <div className="space-y-8">
            {byCategory.map(g => (
              <div key={g.category}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 dark:text-teal-400 mb-3">
                  {CATEGORY_LABELS[g.category]}
                  <span className="ml-2 text-[#a0a3af] dark:text-[#908fa0] font-normal">({g.items.length})</span>
                </h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {g.items.map(u => <UniversityCard key={u.slug} u={u} />)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mb-14">
          <AdSlot slot={ADSENSE_SLOT_PUBLIC} className="h-24" />
        </div>

        <section>
          <h2 className="font-display text-xl font-bold text-[#1E293B] mb-5">Por região</h2>
          <div className="space-y-8">
            {byRegion.map(g => (
              <div key={g.region}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 dark:text-teal-400 mb-3">
                  {REGION_LABELS[g.region]}
                  <span className="ml-2 text-[#a0a3af] dark:text-[#908fa0] font-normal">({g.items.length})</span>
                </h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {g.items.map(u => <UniversityCard key={u.slug} u={u} />)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <PublicFooter />
    </div>
  )
}
