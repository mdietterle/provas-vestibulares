import { ENEM_GUIDE_SECTIONS, ENEM_STUDY_GUIDE } from '../enemStudyGuide'
import type { StudyGuide } from '../studyGuideTypes'

export const guide: StudyGuide = {
  path: '/universidades/enem/como-estudar',
  seoTitle: 'Como estudar para o ENEM: o que estudar em cada matéria | Prova Online',
  seoDescription:
    'Guia de estudos do ENEM: estrutura da prova, cronograma, como estudar sozinho, competências da redação e o que estudar em cada matéria, com sites gratuitos para cada conteúdo.',
  badge: 'Guia de estudos do ENEM',
  headline: 'Como estudar para o ENEM: o que estudar em cada matéria',
  intro:
    'Este guia reúne o que costuma cair em cada área do ENEM, como montar um cronograma e como estudar por conta própria. Para cada conteúdo há um resumo do que dominar, sites gratuitos para estudá-lo e orientações práticas por matéria. O material foi elaborado por nós a partir do formato oficial da prova e de guias educacionais, como o',
  sourceLabel: 'Guia da Carreira',
  sourceUrl: 'https://www.guiadacarreira.com.br/blog/conteudo-enem',
  officialLabel: 'enem.inep.gov.br',
  officialUrl: 'https://enem.inep.gov.br/participante/',
  ctaTitle: 'Treine para o ENEM',
  ctaText: 'Monte simulados com questões no estilo e nível do ENEM.',
  backTo: '/universidades/enem',
  backLabel: 'Voltar para a página do ENEM',
  breadcrumb: [
    { label: 'Início', to: '/' },
    { label: 'Universidades', to: '/universidades' },
    { label: 'ENEM', to: '/universidades/enem' },
    { label: 'Como estudar' },
  ],
  sections: ENEM_GUIDE_SECTIONS,
  subjects: ENEM_STUDY_GUIDE,
}
