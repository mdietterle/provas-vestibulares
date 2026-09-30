import React from 'react'
import { Link } from 'react-router-dom'
import { getUniversityBySlug, CATEGORY_LABELS, type University } from '../../data/universities'
import AdSlot from '../../components/AdSlot'
import Seo from '../../components/Seo'
import PublicHeader from '../../components/PublicHeader'
import PublicFooter from '../../components/PublicFooter'
import Breadcrumb from '../../components/Breadcrumb'
import { getStudyGuide } from '../../data/studyGuides'

const ADSENSE_SLOT_PUBLIC = (import.meta.env.VITE_ADSENSE_SLOT_PUBLIC as string | undefined) || ''

interface Props {
  slug: string
  customContent?: React.ReactNode
}

export default function UniversityBasePage({ slug, customContent }: Props) {
  const u: University | undefined = getUniversityBySlug(slug)

  if (!u) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#10131a] flex items-center justify-center">
        <div className="text-center p-8 bg-white dark:bg-[#1a233a] rounded-2xl border shadow-sm">
          <h1 className="text-2xl font-bold mb-2">Universidade não encontrada</h1>
          <p className="text-[#64748B] mb-4">A instituição solicitada não está cadastrada.</p>
          <Link to="/universidades" className="text-[#712ae2] font-semibold hover:underline">
            &larr; Voltar para todas as universidades
          </Link>
        </div>
      </div>
    )
  }

  const hasStudyGuide = !!getStudyGuide(u.slug)

  const faqs = [
    {
      q: `Como funciona o vestibular da ${u.shortName}?`,
      a: u.vestibularType,
    },
    {
      q: `Quando ocorre o exame/vestibular da ${u.shortName}?`,
      a: `${u.admissionCalendar} As datas exatas variam por edição. Consulte o edital oficial para confirmação.`,
    },
    ...(u.mainCourses.length > 0 ? [{
      q: `Quais os principais cursos da ${u.shortName}?`,
      a: `Dentre os cursos mais procurados destacam-se: ${u.mainCourses.join(', ')}.`,
    }] : []),
    {
      q: `Como praticar simulados para a ${u.shortName}?`,
      a: u.hasRealImporter
        ? `No Cognition AI você encontra questões e simulados baseados nas provas reais publicadas pela ${u.shortName}.`
        : `Você pode realizar simulados no formato da ${u.shortName} gerados com suporte de IA segundo a matriz da instituição.`,
    },
  ]

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollegeOrUniversity',
      name: u.fullName,
      alternateName: u.shortName,
      url: u.officialUrl,
      address: { '@type': 'PostalAddress', addressRegion: u.state, addressCountry: 'BR' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ]

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#10131a] font-sans">
      <Seo
        title={`${u.shortName} (${u.fullName}) — Simulados, Provas e Informações | Cognition AI`}
        description={`Guia completo da ${u.fullName} (${u.shortName}): vestibulares, cursos mais procurados, formato de provas e simulados.`}
        path={`/universidades/${u.slug}`}
        jsonLd={jsonLd}
      />
      <PublicHeader />

      <div className="max-w-3xl mx-auto px-6 py-12">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Universidades', to: '/universidades' }, { label: u.shortName }]} />

        {/* Hero Section */}
        <div className="bg-white dark:bg-[#191b23] border border-[#E2E8F0] dark:border-[#464554] rounded-2xl p-6 sm:p-8 mb-8 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#712ae2] dark:text-[#818CF8] bg-[#f1ecfc] dark:bg-[#241f3d] rounded-full px-3 py-1">
              {CATEGORY_LABELS[u.category]}
            </span>
            <span className="text-xs font-semibold text-[#64748B] dark:text-[#908fa0]">{u.state} — {u.region}</span>
            {u.hasRealImporter && (
              <span className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-full px-3 py-1">
                Provas Reais no Banco
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1E293B] dark:text-white mb-2">
            {u.fullName} ({u.shortName})
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#908fa0] leading-relaxed">
            {u.description}
          </p>
        </div>

        {/* Custom page content inserted here if available */}
        {customContent}

        {/* Main Information Sections */}
        <div className="space-y-8 text-sm leading-relaxed text-[#333] dark:text-[#c7ccd9]">
          <section className="bg-white dark:bg-[#191b23] border border-[#E2E8F0] dark:border-[#464554] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-3 text-[#1E293B] dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#712ae2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Tipo de Vestibular e Seleção
            </h2>
            <p className="text-[#555] dark:text-[#908fa0]">{u.vestibularType}</p>
          </section>

          <section className="bg-white dark:bg-[#191b23] border border-[#E2E8F0] dark:border-[#464554] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-3 text-[#1E293B] dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#712ae2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendário de Ingresso Típico
            </h2>
            <p className="text-[#555] dark:text-[#908fa0]">{u.admissionCalendar}</p>
            <p className="text-xs text-[#a0a3af] dark:text-[#908fa0] mt-3">
              As datas são baseadas em padrões anteriores e podem variar. Consulte o edital no site oficial da instituição.
            </p>
          </section>

          {u.mainCourses.length > 0 && (
            <section className="bg-white dark:bg-[#191b23] border border-[#E2E8F0] dark:border-[#464554] rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-3 text-[#1E293B] dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-[#712ae2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h5m-5 0V11m0 0h5m-5 0H7" />
                </svg>
                Cursos Mais Procurados
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {u.mainCourses.map(c => (
                  <div key={c} className="bg-[#F4F6F9] dark:bg-[#1d1f27] px-3 py-2 rounded-lg text-xs font-medium text-[#1E293B] dark:text-[#e1e7f5] border border-[#E2E8F0] dark:border-[#464554]">
                    {c}
                  </div>
                ))}
              </div>
            </section>
          )}

          {hasStudyGuide && (
            <section className="bg-white dark:bg-[#191b23] border border-[#E2E8F0] dark:border-[#464554] rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-2 text-[#1E293B] dark:text-white">Guia de estudos: como estudar para {u.shortName}</h2>
              <p className="text-[#555] dark:text-[#908fa0] mb-3">
                O que estudar e como estudar em cada matéria, com orientações e sites gratuitos para cada conteúdo.
              </p>
              <Link to={`/universidades/${u.slug}/como-estudar`} className="text-sm font-semibold text-[#712ae2] dark:text-[#818CF8] hover:underline">
                Ver o guia de estudos &rarr;
              </Link>
            </section>
          )}

          {u.notes && (
            <section className="bg-amber-50 dark:bg-[#252014] border border-amber-200 dark:border-[#42361b] rounded-2xl p-6">
              <h2 className="text-sm font-bold mb-1 text-amber-800 dark:text-amber-300">Observação importante</h2>
              <p className="text-xs text-amber-700 dark:text-amber-400">{u.notes}</p>
            </section>
          )}

          <section className="bg-white dark:bg-[#191b23] border border-[#E2E8F0] dark:border-[#464554] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 text-[#1E293B] dark:text-white">Perguntas Frequentes</h2>
            <div className="space-y-4 divide-y divide-[#E2E8F0] dark:divide-[#464554]">
              {faqs.map((f, idx) => (
                <div key={f.q} className={idx > 0 ? 'pt-4' : ''}>
                  <h3 className="font-semibold text-[#1E293B] dark:text-white mb-1">{f.q}</h3>
                  <p className="text-[#555] dark:text-[#908fa0] text-xs">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-[#4f46e5] to-[#712ae2] text-white p-6 rounded-2xl shadow-md">
            <div>
              <h3 className="font-bold text-lg mb-1">Treinar para a {u.shortName}</h3>
              <p className="text-xs text-white/80">Monte simulados com questões no estilo e nível da {u.shortName}.</p>
            </div>
            <Link
              to="/aluno"
              className="px-5 py-2.5 rounded-xl bg-white text-[#4f46e5] font-bold text-xs hover:bg-white/90 transition-colors shrink-0"
            >
              Criar Simulado
            </Link>
          </section>

          <section className="pt-2">
            <a
              href={u.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#712ae2] dark:text-[#818CF8] hover:underline"
            >
              Acessar site oficial do vestibular ({u.shortName}) &rarr;
            </a>
          </section>
        </div>

        <div className="mt-8">
          <AdSlot slot={ADSENSE_SLOT_PUBLIC} className="h-24" />
        </div>
      </div>
      <PublicFooter />
    </div>
  )
}
