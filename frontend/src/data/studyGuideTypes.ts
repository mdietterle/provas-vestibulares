export interface StudyLink {
  label: string
  url: string
}

export interface StudyTopic {
  id: string
  title: string
  summary: string
  group?: string
  links: StudyLink[]
}

export interface StudySubject {
  id: string
  name: string
  group: string
  intro: string
  orientacoes: string[]
  topics: StudyTopic[]
  extra?: { title: string; intro: string; items: StudyTopic[] }
}

/** Bloco de texto livre exibido antes da lista de matérias (estrutura da prova,
 * cronograma, dicas gerais etc.). */
export interface GuideSection {
  id?: string
  title: string
  paragraphs?: string[]
  listTitle?: string
  list?: string[]
  ordered?: boolean
  /** Tópicos com links de estudo (ex.: recursos gratuitos). */
  topics?: StudyTopic[]
  /** Link interno de destaque no fim do bloco (ex.: apontar para outro guia). */
  link?: { to: string; label: string }
  /** Links externos de fontes oficiais. */
  sources?: StudyLink[]
}

export interface StudyGuide {
  path: string
  seoTitle: string
  seoDescription: string
  badge: string
  headline: string
  /** Parágrafo de abertura; `{source}` é substituído pelo link da fonte oficial. */
  intro: string
  sourceLabel: string
  sourceUrl: string
  officialLabel: string
  officialUrl: string
  ctaTitle: string
  ctaText: string
  backTo: string
  backLabel: string
  breadcrumb: { label: string; to?: string }[]
  sections: GuideSection[]
  subjects: StudySubject[]
}
