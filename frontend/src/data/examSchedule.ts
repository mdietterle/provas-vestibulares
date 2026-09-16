// Estimativa de calendário dos vestibulares que o Cognition AI já importa de
// verdade (ver `REAL_IMPORTER_SLUGS` em `universities.ts`), usada só pra
// mostrar QUANDO a próxima edição costuma acontecer, de forma aproximada.
//
// Os meses aqui são um padrão histórico recorrente lido nos próprios editais/
// páginas oficiais, NÃO uma data confirmada da próxima edição — cada
// instituição pode antecipar, atrasar ou mudar o formato a qualquer ano.
// Sempre linkamos pro site oficial pra confirmação.
//
// Instituições com processo seletivo próprio DESCONTINUADO (ex.: UFRN desde
// 2013, UFPA desde 2014 — ambas hoje só entram via SiSU/ENEM) ficam de fora
// de propósito: não existe "próxima edição" real pra elas, só as provas
// antigas que já estão no banco.
//
// Instituições cujo processo não tem um mês único confiável pra estimar
// (SiSU-dependente, seriado plurianual, múltiplas chamadas contínuas ao
// longo do ano) entram em `NO_FIXED_DATE_SLUGS` em vez de `EXAM_SCHEDULES` —
// mostradas na página com etapas + site, sem data específica fabricada.

export interface ExamPhase {
  label: string
  /** mês em que a prova dessa fase costuma acontecer (1-12) */
  month: number
}

export interface ExamSchedule {
  slug: string
  phases: ExamPhase[]
}

export const EXAM_SCHEDULES: ExamSchedule[] = [
  // ENEM e ACAFE não entram aqui — têm data OFICIAL confirmada em
  // `OFFICIAL_EXAM_INFO`, mostrada numa seção separada da página em vez de
  // estimativa por mês.
  { slug: 'ita', phases: [{ label: '1ª fase (objetiva)', month: 10 }, { label: '2ª fase (discursiva)', month: 11 }] },
  { slug: 'fuvest', phases: [{ label: '1ª fase', month: 11 }, { label: '2ª fase', month: 12 }] },
  { slug: 'unicamp', phases: [{ label: '1ª etapa', month: 10 }, { label: '2ª etapa', month: 12 }] },
  { slug: 'unesp', phases: [{ label: '1ª fase', month: 11 }, { label: '2ª fase', month: 12 }] },
  { slug: 'ufpr', phases: [{ label: 'Prova (Núcleo de Concursos)', month: 1 }] },
  { slug: 'pucpr', phases: [{ label: 'Vestibular de Verão', month: 12 }, { label: 'Vestibular de Inverno', month: 6 }] },
  { slug: 'pucrs', phases: [{ label: 'Vestibular de Verão', month: 11 }, { label: 'Vestibular de Inverno', month: 6 }] },
  { slug: 'pucrio', phases: [{ label: 'Processo principal (Verão)', month: 11 }, { label: 'Vestibular de Inverno', month: 6 }] },
  { slug: 'udesc', phases: [{ label: 'Vestibular de Verão', month: 11 }, { label: 'Vestibular de Inverno', month: 6 }] },
  { slug: 'unicentro', phases: [{ label: 'Vestibular próprio', month: 11 }] },
  { slug: 'unioeste', phases: [{ label: 'Concurso Vestibular Unificado', month: 11 }] },
  { slug: 'uem', phases: [{ label: 'Vestibular de Inverno', month: 7 }, { label: 'Vestibular de Verão', month: 12 }] },
  { slug: 'uerj', phases: [{ label: 'Exames de Qualificação', month: 5 }, { label: 'Exame Discursivo', month: 9 }] },
  { slug: 'ufgd', phases: [{ label: 'PSV (prova única)', month: 10 }] },
  { slug: 'ufsc', phases: [{ label: 'Vestibular unificado UFSC/IFSC/IFC', month: 12 }] },
  { slug: 'ufrgs', phases: [{ label: 'Concurso Vestibular', month: 11 }] },
  { slug: 'cebraspe', phases: [{ label: 'Provas (2 dias)', month: 11 }] },
  { slug: 'fgv', phases: [{ label: 'Provas presenciais', month: 10 }] },
  { slug: 'unimontes', phases: [{ label: 'Vestibular próprio', month: 11 }] },
  { slug: 'puccampinas', phases: [{ label: 'Edição principal', month: 11 }, { label: 'Vestibular de Inverno', month: 6 }] },
  { slug: 'ufam', phases: [{ label: 'Etapa anual do PSC', month: 11 }] },
  { slug: 'utfpr', phases: [{ label: 'Vestibular de Verão', month: 11 }, { label: 'Vestibular de Inverno', month: 6 }] },
  { slug: 'uel', phases: [{ label: 'Vestibular (fase única, 2 dias)', month: 11 }] },
  { slug: 'ulbra', phases: [{ label: 'Vestibular 1º semestre', month: 12 }, { label: 'Vestibular 2º semestre', month: 6 }] },
  { slug: 'ufu', phases: [{ label: 'Processo complementar (2º semestre)', month: 6 }] },
]

/** Real importer, mas sem mês único confiável pra estimar (SiSU-dependente,
 * seriado plurianual, ou múltiplas chamadas contínuas ao longo do ano) —
 * mostrado na página com etapas + site, sem data fabricada. Inclui UFRN e
 * UFPA: o processo seletivo PRÓPRIO delas está descontinuado (2013/2014,
 * hoje só entram via SiSU/ENEM), mas ainda existe uma via real e recorrente
 * de ingresso (o ENEM) — por isso aparecem aqui com o selo de SiSU/ENEM em
 * vez de ficarem totalmente escondidas da página. */
export const NO_FIXED_DATE_SLUGS = new Set([
  'ufpel', 'ufms', 'unifesp', 'espm', 'unaerp', 'ufjf', 'pucminas', 'ufg', 'ufsm',
  'ufrn', 'ufpa',
])

/** Universidades cujo texto oficial (`vestibularType`) descreve o SiSU/ENEM
 * como via de ingresso principal ou majoritária — usado pra mostrar o selo
 * "Via principal: SiSU/ENEM" com link de volta pra entrada do ENEM (que tem
 * data oficial confirmada, ver `OFFICIAL_EXAM_INFO`). */
export const SISU_LINKED_SLUGS = new Set(['ufg', 'ufu', 'unifesp', 'ufpel', 'ufrn', 'ufpa'])

export interface OfficialExamInfo {
  slug: string
  /** data(s) real(is) da prova, já confirmada(s) em edital — não estimativa */
  examDateLabel: string
  registrationWindowLabel: string
  /** true se, na data de hoje, a inscrição ainda está aberta */
  isRegistrationOpenNow: (today: Date) => boolean
  howToRegister: string
  registrationUrl: string
  sourceNote: string
}

// Datas confirmadas em edital oficial (Inep/Acafe), levantadas via busca em
// 2026-09 — não são estimativa de padrão histórico como o resto do arquivo.
// Reconfirme sempre no site oficial antes de decidir com base nelas: o Inep
// e a Acafe bloqueiam scraping direto (conteúdo renderizado via JS), então
// os números abaixo vieram de agregadores que replicam o edital, não de
// leitura direta do HTML oficial.
export const OFFICIAL_EXAM_INFO: OfficialExamInfo[] = [
  {
    slug: 'enem',
    examDateLabel: '8 e 15 de novembro de 2026',
    registrationWindowLabel: '25 de maio a 5 de junho de 2026 (já encerrada para a edição 2026)',
    isRegistrationOpenNow: () => false,
    howToRegister: 'Inscrição exclusivamente pela Página do Participante, com login gov.br. Concluintes de escola pública têm inscrição automática (mediante confirmação posterior); os demais pagam taxa de R$ 85 (isenção para casos previstos em edital).',
    registrationUrl: 'https://enem.inep.gov.br/participante/',
    sourceNote: 'Datas do edital oficial do Inep para o ENEM 2026, via cobertura especializada — confirme no site do Inep antes de decidir com base nelas.',
  },
  {
    slug: 'acafe',
    examDateLabel: '22 de novembro de 2026 (Vestibular de Verão 2027)',
    registrationWindowLabel: '1º a 29 de setembro de 2026 (pagamento até 30/09)',
    isRegistrationOpenNow: (today) => today >= new Date(2026, 8, 1) && today <= new Date(2026, 8, 29),
    howToRegister: 'Inscrição exclusivamente pelo site oficial da Acafe (acafe.org.br/vestibular), preenchendo o formulário e pagando o boleto da taxa dentro do prazo.',
    registrationUrl: 'https://www.acafe.org.br/',
    sourceNote: 'Datas do edital oficial da Acafe para o Vestibular de Verão 2027, via cobertura especializada — confirme no site da Acafe antes de decidir com base nelas.',
  },
]

/** Próxima ocorrência (mês/ano) de uma fase, a partir de hoje — assume
 * padrão anual recorrente; se o mês já passou este ano, rola pro ano que
 * vem. Granularidade de mês só (sem dia exato disponível na fonte). */
export function nextOccurrence(month: number, today: Date = new Date()): Date {
  const year = month < today.getMonth() + 1 ? today.getFullYear() + 1 : today.getFullYear()
  return new Date(year, month - 1, 1)
}

export const MONTH_NAMES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
