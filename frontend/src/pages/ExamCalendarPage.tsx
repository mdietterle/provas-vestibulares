import { Link } from 'react-router-dom'
import { UNIVERSITIES, getUniversityBySlug } from '../data/universities'
import {
  EXAM_SCHEDULES,
  NO_FIXED_DATE_SLUGS,
  SISU_LINKED_SLUGS,
  OFFICIAL_EXAM_INFO,
  nextOccurrence,
  MONTH_NAMES_PT,
} from '../data/examSchedule'
import AdSlot from '../components/AdSlot'
import Seo from '../components/Seo'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'
import Breadcrumb from '../components/Breadcrumb'

const ADSENSE_SLOT_PUBLIC = (import.meta.env.VITE_ADSENSE_SLOT_PUBLIC as string | undefined) || ''

function SisuBadge({ slug }: { slug: string }) {
  if (!SISU_LINKED_SLUGS.has(slug)) return null
  return (
    <Link
      to="/calendario#enem"
      className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#241f3d] rounded-full px-2 py-0.5 tracking-wider hover:underline"
    >
      Via principal: SiSU/ENEM
    </Link>
  )
}

type UpcomingEntry = {
  slug: string
  shortName: string
  officialUrl: string
  phaseLabel: string
  date: Date
  allPhases: string[]
}

const today = new Date()

function buildUpcoming(): UpcomingEntry[] {
  const entries: UpcomingEntry[] = []
  for (const schedule of EXAM_SCHEDULES) {
    const u = getUniversityBySlug(schedule.slug)
    if (!u) continue
    const allPhases = schedule.phases.map(p => p.label)
    for (const phase of schedule.phases) {
      entries.push({
        slug: u.slug,
        shortName: u.shortName,
        officialUrl: u.officialUrl,
        phaseLabel: phase.label,
        date: nextOccurrence(phase.month, today),
        allPhases,
      })
    }
  }
  return entries.sort((a, b) => a.date.getTime() - b.date.getTime())
}

function formatMonthYear(d: Date): string {
  return `${MONTH_NAMES_PT[d.getMonth()]} de ${d.getFullYear()}`
}

export default function ExamCalendarPage() {
  const upcoming = buildUpcoming()
  const noFixedDate = UNIVERSITIES.filter(u => NO_FIXED_DATE_SLUGS.has(u.slug))

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#10131a] font-sans">
      <Seo
        title="Calendário de vestibulares 2027 — datas de inscrição e prova | Cognition AI"
        description="Calendário atualizado com datas de inscrição e prova dos principais vestibulares brasileiros: ENEM, FUVEST, ITA, UFPR, UFRGS e outros."
        path="/calendario"
      />
      <PublicHeader />

      <div className="max-w-3xl mx-auto px-6 py-14">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Universidades', to: '/universidades' }, { label: 'Calendário' }]} />

        <h1 className="font-display text-3xl font-bold text-[#1E293B] mt-2 mb-2">Calendário de vestibulares</h1>
        <p className="text-sm text-[#64748B] mb-4 max-w-2xl">
          Próximas edições dos vestibulares cujas provas anteriores já estão no banco de questões do Cognition AI.
        </p>
        <p className="text-sm text-[#64748B] mb-10 max-w-2xl leading-relaxed">
          Cada vestibular tem sua própria lógica de calendário: exames nacionais como o ENEM seguem um cronograma
          único definido pelo Inep, enquanto processos seletivos próprios de universidades estaduais e federais
          costumam ter editais publicados meses antes, com inscrição, primeira fase e segunda fase em datas
          distintas — e às vezes mais de uma edição por ano, como nos vestibulares de Verão e de Inverno. Por isso
          organizamos abaixo tanto as datas já confirmadas em edital quanto uma estimativa baseada no padrão
          histórico de cada instituição, pra você planejar os estudos com antecedência mesmo antes do edital sair.
        </p>

        <section id="enem" className="mb-14">
          <h2 className="text-lg font-bold mb-1 text-[#1E293B]">Datas oficiais confirmadas</h2>
          <p className="text-xs text-[#64748B] mb-4 max-w-2xl">
            Diferente do resto da página (estimativa por padrão histórico), estas datas já foram publicadas em edital
            oficial — mas sempre confirme no site oficial antes de decidir com base nelas.
          </p>
          <div className="space-y-4">
            {OFFICIAL_EXAM_INFO.map(info => {
              const u = getUniversityBySlug(info.slug)
              if (!u) return null
              const open = info.isRegistrationOpenNow(today)
              return (
                <div key={info.slug} className="rounded-xl border border-[#E2E8F0] bg-white p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                    <Link to={`/universidades/${u.slug}`} className="font-display font-bold text-lg text-[#1E293B] hover:text-slate-500">
                      {u.shortName}
                    </Link>
                    {open && (
                      <span className="text-[10px] uppercase font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-full px-2 py-0.5 tracking-wider">
                        Inscrição aberta agora
                      </span>
                    )}
                  </div>
                  <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
                    <div>
                      <dt className="text-[10px] uppercase font-bold text-[#a0a3af] dark:text-[#908fa0] tracking-wider">Data da prova</dt>
                      <dd className="text-[#1E293B] dark:text-[#e5e9f5] font-semibold">{info.examDateLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase font-bold text-[#a0a3af] dark:text-[#908fa0] tracking-wider">Inscrição</dt>
                      <dd className="text-[#1E293B] dark:text-[#e5e9f5] font-semibold">{info.registrationWindowLabel}</dd>
                    </div>
                  </dl>
                  <p className="text-sm text-[#333] dark:text-[#c7ccd9] mb-3">
                    <span className="font-semibold">Como se inscrever: </span>{info.howToRegister}
                  </p>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-[#a0a3af] dark:text-[#908fa0]">{info.sourceNote}</p>
                    <a
                      href={info.registrationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline whitespace-nowrap shrink-0"
                    >
                      Site oficial / inscrição →
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mb-14">
          <h2 className="text-lg font-bold mb-1 text-[#1E293B]">Estimativa por padrão histórico</h2>
          <p className="text-xs text-[#a0a3af] dark:text-[#908fa0] mb-4 max-w-2xl">
            Os meses abaixo são um padrão recorrente lido nos próprios editais — não a data confirmada da próxima
            edição. Cada instituição pode antecipar, atrasar ou mudar o formato a qualquer ano.
          </p>
          <div className="space-y-3">
            {upcoming.map((e, i) => (
              <div
                key={`${e.slug}-${e.phaseLabel}-${i}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/universidades/${e.slug}`} className="font-display font-bold text-[#1E293B] hover:text-slate-500">
                      {e.shortName}
                    </Link>
                    {e.allPhases.length > 1 && (
                      <span className="text-[10px] uppercase font-bold text-[#a0a3af] dark:text-[#908fa0] tracking-wider">
                        {e.phaseLabel}
                      </span>
                    )}
                    <SisuBadge slug={e.slug} />
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">Etapas: {e.allPhases.join(' · ')}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 capitalize">
                    {formatMonthYear(e.date)}
                  </span>
                  <a
                    href={e.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline whitespace-nowrap"
                  >
                    Site oficial →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {noFixedDate.length > 0 && (
          <section className="border-t border-[#E2E8F0] pt-8">
            <h2 className="text-lg font-bold mb-1 text-[#1E293B]">Sem data própria fixa</h2>
            <p className="text-xs text-[#64748B] mb-4 max-w-2xl">
              Estas instituições também têm provas reais importadas no sistema, mas o processo seletivo não tem um mês
              único confiável pra estimar — normalmente porque o ingresso depende do SiSU/ENEM (veja a data oficial
              acima), é seriado ao longo de vários anos, ou tem chamadas contínuas. Confira as etapas e o contato
              direto no site oficial.
            </p>
            <div className="space-y-2">
              {noFixedDate.map(u => (
                <div key={u.slug} className="flex items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/universidades/${u.slug}`} className="font-display font-bold text-[#1E293B] hover:text-slate-500">
                        {u.shortName}
                      </Link>
                      <SisuBadge slug={u.slug} />
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2">{u.vestibularType}</p>
                  </div>
                  <a
                    href={u.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline whitespace-nowrap shrink-0"
                  >
                    Site oficial →
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10">
          <AdSlot slot={ADSENSE_SLOT_PUBLIC} className="h-24" />
        </div>
      </div>
      <PublicFooter />
    </div>
  )
}
