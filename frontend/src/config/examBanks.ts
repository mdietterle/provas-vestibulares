export interface ExamBankConfig {
  label: string
  areaColors: Record<string, string>
  filters: ('year' | 'area' | 'language')[]
  optionStyle: 'letter' | 'value' | 'html' | 'no_letter'
  hasImages: boolean
  letterRange?: string
}

const DEFAULT_AREA_COLORS: Record<string, string> = {
  'Ciências da Natureza': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Ciências Humanas': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Linguagens': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Matemática': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Redação': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export const EXAM_BANKS: Record<string, ExamBankConfig> = {
  enem: {
    label: 'ENEM',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area', 'language'],
    optionStyle: 'letter',
    hasImages: false,
    letterRange: 'ABCDE',
  },
  ufpr: {
    label: 'UFPR',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area', 'language'],
    optionStyle: 'letter',
    hasImages: false,
    letterRange: 'ABCDE',
  },
  acafe: {
    label: 'ACAFE',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area', 'language'],
    optionStyle: 'letter',
    hasImages: true,
    letterRange: 'ABCD',
  },
  ufrgs: {
    label: 'UFRGS',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area'],
    optionStyle: 'letter',
    hasImages: false,
    letterRange: 'ABCDE',
  },
  pucpr: {
    label: 'PUCPR',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area', 'language'],
    optionStyle: 'letter',
    hasImages: false,
    letterRange: 'ABCDE',
  },
  ufsc: {
    label: 'UFSC',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area'],
    optionStyle: 'value',
    hasImages: true,
  },
  fgv: {
    label: 'FGV',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area'],
    optionStyle: 'letter',
    hasImages: false,
    letterRange: 'ABCDE',
  },
  espm: {
    label: 'ESPM',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area'],
    optionStyle: 'letter',
    hasImages: false,
    letterRange: 'ABCDE',
  },
  ita: {
    label: 'ITA',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area'],
    optionStyle: 'letter',
    hasImages: false,
    letterRange: 'ABCDE',
  },
  fuvest: {
    label: 'FUVEST',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area'],
    optionStyle: 'letter',
    hasImages: false,
    letterRange: 'ABCDE',
  },
  unicamp: {
    label: 'UNICAMP',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area'],
    optionStyle: 'letter',
    hasImages: false,
    letterRange: 'ABCDE',
  },
  udesc: {
    label: 'UDESC',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area'],
    optionStyle: 'letter',
    hasImages: false,
    letterRange: 'ABCDE',
  },
  ufms: {
    label: 'UFMS',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year'],
    optionStyle: 'html',
    hasImages: true,
  },
  uem: {
    label: 'UEM',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area'],
    optionStyle: 'value',
    hasImages: true,
  },
  ufgd: {
    label: 'UFGD',
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area'],
    optionStyle: 'letter',
    hasImages: true,
    letterRange: 'ABCDE',
  },
}

// Fallback for exam types not explicitly configured
export function getExamBankConfig(examType: string): ExamBankConfig {
  return EXAM_BANKS[examType] ?? {
    label: examType.toUpperCase(),
    areaColors: DEFAULT_AREA_COLORS,
    filters: ['year', 'area'],
    optionStyle: 'letter',
    hasImages: false,
    letterRange: 'ABCDE',
  }
}