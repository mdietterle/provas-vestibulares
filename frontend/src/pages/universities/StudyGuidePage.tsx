import { Link } from 'react-router-dom'
import AdSlot from '../../components/AdSlot'
import Seo from '../../components/Seo'
import PublicHeader from '../../components/PublicHeader'
import PublicFooter from '../../components/PublicFooter'
import Breadcrumb from '../../components/Breadcrumb'
import type { GuideSection, StudyGuide, StudyTopic } from '../../data/studyGuideTypes'

const ADSENSE_SLOT_PUBLIC = (import.meta.env.VITE_ADSENSE_SLOT_PUBLIC as string | undefined) || ''

const CARD = 'bg-white dark:bg-[#191b23] border border-[#E2E8F0] dark:border-[#464554] rounded-2xl shadow-sm'

function TopicItem({ topic }: { topic: StudyTopic }) {
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <h4 className="font-semibold text-[#1E293B] dark:text-white">{topic.title}</h4>
      <p className="mt-1 text-[#555] dark:text-[#b4b6c4]">{topic.summary}</p>
      {topic.links.length > 0 && (
        <p className="mt-2 text-xs text-[#64748B] dark:text-[#908fa0]">
          <span className="font-semibold">Onde estudar: </span>
          {topic.links.map((l, i) => (
            <span key={l.url}>
              {i > 0 && ' · '}
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 dark:text-slate-400 font-medium hover:underline"
              >
                {l.label}
              </a>
            </span>
          ))}
        </p>
      )}
    </li>
  )
}

function groupTopics(topics: StudyTopic[]): { group?: string; items: StudyTopic[] }[] {
  const out: { group?: string; items: StudyTopic[] }[] = []
  for (const t of topics) {
    const last = out[out.length - 1]
    if (last && last.group === t.group) last.items.push(t)
    else out.push({ group: t.group, items: [t] })
  }
  return out
}

function Section({ section }: { section: GuideSection }) {
  const List = section.ordered ? 'ol' : 'ul'
  return (
    <section
      id={section.id}
      className={`${CARD} p-6 mb-8 text-sm leading-relaxed text-[#333] dark:text-[#c7ccd9] scroll-mt-24`}
    >
      <h2 className="text-lg font-bold mb-3 text-[#1E293B] dark:text-white">{section.title}</h2>
      {section.paragraphs?.map(p => (
        <p key={p} className="mb-3 last:mb-0">
          {p}
        </p>
      ))}
      {section.list && (
        <>
          {section.listTitle && (
            <h3 className="font-semibold text-[#1E293B] dark:text-white mt-4 mb-2">{section.listTitle}</h3>
          )}
          <List className={`${section.ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1.5`}>
            {section.list.map(item => (
              <li key={item}>{item}</li>
            ))}
          </List>
        </>
      )}
      {section.sources && section.sources.length > 0 && (
        <ul className="mt-4 list-disc pl-5 space-y-1.5">
          {section.sources.map(l => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 dark:text-slate-400 font-medium hover:underline">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      {section.link && (
        <p className="mt-4">
          <Link to={section.link.to} className="font-semibold text-slate-500 dark:text-slate-400 hover:underline">
            {section.link.label} &rarr;
          </Link>
        </p>
      )}
      {section.topics && (
        <ul className="mt-4 divide-y divide-[#E2E8F0] dark:divide-[#464554]">
          {section.topics.map(t => (
            <TopicItem key={t.id} topic={t} />
          ))}
        </ul>
      )}
    </section>
  )
}

export default function StudyGuidePage({ guide }: { guide: StudyGuide }) {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.headline,
      description: guide.seoDescription,
      inLanguage: 'pt-BR',
      publisher: { '@type': 'Organization', name: 'Prova Online' },
    },
  ]

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#10131a] font-sans">
      <Seo title={guide.seoTitle} description={guide.seoDescription} path={guide.path} jsonLd={jsonLd} />
      <PublicHeader />

      <div className="max-w-3xl mx-auto px-6 py-12">
        <Breadcrumb items={guide.breadcrumb} />

        <header className={`${CARD} p-6 sm:p-8 mb-8`}>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-[#f1ecfc] dark:bg-[#241f3d] rounded-full px-3 py-1">
            {guide.badge}
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1E293B] dark:text-white mt-3 mb-3">
            {guide.headline}
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#b4b6c4] leading-relaxed">
            {guide.intro}{' '}
            <a href={guide.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
              {guide.sourceLabel}
            </a>
            . Confira sempre o edital e os documentos oficiais em{' '}
            <a href={guide.officialUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
              {guide.officialLabel}
            </a>
            .
          </p>
        </header>

        {guide.sections.map(s => (
          <Section key={s.title} section={s} />
        ))}

        {guide.subjects.length > 0 && (
        <nav aria-label="Matérias" className={`${CARD} p-6 mb-8`}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Matérias do guia
          </h2>
          <ul className="flex flex-wrap gap-2">
            {guide.subjects.map(s => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-block px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F4F6F9] dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554] text-[#1E293B] dark:text-[#e1e7f5] hover:border-slate-500 transition-colors"
                >
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        )}

        <div className="space-y-8 text-sm leading-relaxed text-[#333] dark:text-[#c7ccd9]">
          {guide.subjects.map(subject => (
            <section key={subject.id} id={subject.id} className={`${CARD} p-6 scroll-mt-24`}>
              <p className="text-xs font-semibold text-[#64748B] dark:text-[#908fa0] mb-1">{subject.group}</p>
              <h2 className="text-xl font-bold mb-2 text-[#1E293B] dark:text-white">{subject.name}</h2>
              <p className="mb-5 text-[#555] dark:text-[#b4b6c4]">{subject.intro}</p>

              <div className="rounded-xl border-l-4 border-slate-500 dark:border-slate-400 bg-slate-50 dark:bg-slate-950/20 p-4 mb-6">
                <h3 className="font-bold text-[#1E293B] dark:text-white mb-2">Orientações</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-[#475569] dark:text-slate-300">
                  {subject.orientacoes.map(o => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>

              <h3 className="font-bold text-[#1E293B] dark:text-white mb-3">O que estudar</h3>
              {groupTopics(subject.topics).map(block => (
                <div key={block.group ?? 'all'} className="mb-4 last:mb-0">
                  {block.group && (
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      {block.group}
                    </h3>
                  )}
                  <ul className="divide-y divide-[#E2E8F0] dark:divide-[#464554]">
                    {block.items.map(t => (
                      <TopicItem key={t.id} topic={t} />
                    ))}
                  </ul>
                </div>
              ))}

              {subject.extra && (
                <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#464554]">
                  <h3 className="font-bold text-[#1E293B] dark:text-white mb-1">{subject.extra.title}</h3>
                  <p className="mb-3 text-[#555] dark:text-[#b4b6c4]">{subject.extra.intro}</p>
                  <ul className="divide-y divide-[#E2E8F0] dark:divide-[#464554]">
                    {subject.extra.items.map(t => (
                      <TopicItem key={t.id} topic={t} />
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}

          <section className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-slate-600 to-slate-500 text-white p-6 rounded-2xl shadow-md">
            <div>
              <h3 className="font-bold text-lg mb-1">{guide.ctaTitle}</h3>
              <p className="text-xs text-white/80">{guide.ctaText}</p>
            </div>
            <Link
              to="/aluno"
              className="px-5 py-2.5 rounded-xl bg-white text-slate-600 font-bold text-xs hover:bg-white/90 transition-colors shrink-0"
            >
              Criar Simulado
            </Link>
          </section>

          <p>
            <Link to={guide.backTo} className="font-semibold text-slate-500 dark:text-slate-400 hover:underline">
              &larr; {guide.backLabel}
            </Link>
          </p>
        </div>

        <div className="mt-8">
          <AdSlot slot={ADSENSE_SLOT_PUBLIC} className="h-24" />
        </div>
      </div>
      <PublicFooter />
    </div>
  )
}
