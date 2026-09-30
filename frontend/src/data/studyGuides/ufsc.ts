import { UFSC_STUDY_GUIDE, UFSC_PROGRAM_PDF } from '../ufscStudyGuide'
import type { StudyGuide } from '../studyGuideTypes'

export const guide: StudyGuide = {
  path: '/universidades/ufsc/como-estudar',
  seoTitle: 'Como estudar para a UFSC 2027: o que estudar em cada matéria | Cognition AI',
  seoDescription:
    'Guia do Vestibular UFSC/IFC 2027 baseado no programa oficial da COPERVE: o que estudar e como estudar em Matemática, Física, Química, Biologia, Português, História, Geografia e mais, com sites para cada conteúdo.',
  badge: 'Vestibular UFSC/IFC 2027',
  headline: 'Como estudar para a UFSC: o que estudar em cada matéria',
  intro:
    'Este guia organiza, matéria por matéria, o que a COPERVE pede no programa do vestibular. Para cada conteúdo você encontra um resumo do que precisa dominar e indicações de sites gratuitos para estudá-lo, além de orientações práticas de como estudar cada disciplina. O texto é uma interpretação nossa do documento oficial:',
  sourceLabel: 'Programa das Disciplinas do Vestibular Unificado UFSC/IFC 2027',
  sourceUrl: UFSC_PROGRAM_PDF,
  officialLabel: 'coperve.ufsc.br',
  officialUrl: 'https://coperve.ufsc.br/',
  ctaTitle: 'Treine para a UFSC',
  ctaText: 'Monte simulados com questões no estilo e nível da UFSC.',
  backTo: '/universidades/ufsc',
  backLabel: 'Voltar para a página da UFSC',
  breadcrumb: [
    { label: 'Início', to: '/' },
    { label: 'Universidades', to: '/universidades' },
    { label: 'UFSC', to: '/universidades/ufsc' },
    { label: 'Como estudar' },
  ],
  sections: [
    {
      title: 'O que a prova da UFSC realmente avalia',
      paragraphs: [
        'O programa deixa claro que a seleção não quer medir só memória. As provas observam se o candidato consegue se expressar com clareza, organizar ideias, interpretar dados e fatos, relacionar áreas do conhecimento, levantar hipóteses, fazer avaliações, conectar o que sabe ao mundo atual e dominar os conteúdos do Ensino Médio.',
      ],
      listTitle: 'Um roteiro de estudo que funciona',
      ordered: true,
      list: [
        'Leia o programa da sua carreira e marque o que você já domina e o que nunca estudou.',
        'Distribua as semanas por matéria, dando mais tempo aos temas grandes (em Matemática, Física e Química o programa é longo).',
        'Alterne teoria e prática: depois de estudar um tópico, resolva questões dele no mesmo dia.',
        'Faça provas anteriores da UFSC com tempo marcado e revise cada erro.',
        'Escreva uma redação por semana e leia as obras indicadas de Literatura ao longo de todo o ano.',
      ],
    },
  ],
  subjects: UFSC_STUDY_GUIDE,
}
