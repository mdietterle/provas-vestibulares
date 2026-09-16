export type Region = 'Nacional' | 'Sudeste' | 'Sul' | 'Centro-Oeste' | 'Nordeste' | 'Norte';

export interface ExamMetadata {
  id: string;
  label: string;
  region: Region;
  color: string;
  gradient: string;
}

const REGION_COLORS: Record<Region, { color: string, gradient: string }> = {
  'Nacional': { color: '#2563EB', gradient: 'linear-gradient(135deg, #2563EB 0%, #0047cc 100%)' },
  'Sudeste': { color: '#be123c', gradient: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)' },
  'Sul': { color: '#6366F1', gradient: 'linear-gradient(135deg, #6366F1 0%, #8b5cf6 100%)' },
  'Centro-Oeste': { color: '#c2410c', gradient: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)' },
  'Nordeste': { color: '#0f766e', gradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)' },
  'Norte': { color: '#b45309', gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)' },
};

const EXAM_DATA: Array<{ id: string; label: string; region: Region }> = [
  // Nacional
  { id: 'enem', label: 'ENEM', region: 'Nacional' },
  { id: 'ita', label: 'ITA', region: 'Nacional' },
  // Sudeste
  { id: 'fuvest', label: 'FUVEST', region: 'Sudeste' },
  { id: 'unicamp', label: 'UNICAMP', region: 'Sudeste' },
  { id: 'unesp', label: 'UNESP', region: 'Sudeste' },
  { id: 'pucrio', label: 'PUC-Rio', region: 'Sudeste' },
  { id: 'espm', label: 'ESPM', region: 'Sudeste' },
  { id: 'fgv', label: 'FGV', region: 'Sudeste' },
  { id: 'uerj', label: 'UERJ', region: 'Sudeste' },
  { id: 'pucminas', label: 'PUC Minas', region: 'Sudeste' },
  { id: 'unimontes', label: 'UNIMONTES', region: 'Sudeste' },
  { id: 'unaerp', label: 'UNAERP', region: 'Sudeste' },
  { id: 'puccampinas', label: 'PUC-Campinas', region: 'Sudeste' },
  { id: 'ufjf', label: 'UFJF', region: 'Sudeste' },
  { id: 'ufu', label: 'UFU', region: 'Sudeste' },
  // Sul
  { id: 'acafe', label: 'ACAFE', region: 'Sul' },
  { id: 'ufpr', label: 'UFPR', region: 'Sul' },
  { id: 'ufsc', label: 'UFSC', region: 'Sul' },
  { id: 'ufrgs', label: 'UFRGS', region: 'Sul' },
  { id: 'ufpel', label: 'UFPEL', region: 'Sul' },
  { id: 'pucpr', label: 'PUCPR', region: 'Sul' },
  { id: 'udesc', label: 'UDESC', region: 'Sul' },
  { id: 'uem', label: 'UEM', region: 'Sul' },
  { id: 'uel', label: 'UEL', region: 'Sul' },
  { id: 'pucrs', label: 'PUCRS', region: 'Sul' },
  { id: 'ufsm', label: 'UFSM', region: 'Sul' },
  { id: 'ulbra', label: 'ULBRA', region: 'Sul' },
  { id: 'unicentro', label: 'UNICENTRO', region: 'Sul' },
  { id: 'unioeste', label: 'UNIOESTE', region: 'Sul' },
  { id: 'utfpr', label: 'UTFPR', region: 'Sul' },
  { id: 'upf', label: 'UPF', region: 'Sul' },
  // Centro-Oeste
  { id: 'ufgd', label: 'UFGD', region: 'Centro-Oeste' },
  { id: 'ufms', label: 'UFMS', region: 'Centro-Oeste' },
  { id: 'ufg', label: 'UFG', region: 'Centro-Oeste' },
  // Nordeste
  { id: 'ufrn', label: 'UFRN', region: 'Nordeste' },
  // Norte
  { id: 'ufpa', label: 'UFPA', region: 'Norte' },
  { id: 'ufam', label: 'UFAM', region: 'Norte' },
];

export const EXAM_TYPES: ExamMetadata[] = EXAM_DATA.map(exam => ({
  ...exam,
  color: REGION_COLORS[exam.region].color,
  gradient: REGION_COLORS[exam.region].gradient,
}));

export const EXAM_TYPE_LABEL: Record<string, string> = EXAM_TYPES.reduce((acc, exam) => {
  acc[exam.id] = exam.label;
  return acc;
}, {} as Record<string, string>);

export const EXAM_TYPE_COLOR: Record<string, string> = EXAM_TYPES.reduce((acc, exam) => {
  acc[exam.id] = exam.color;
  return acc;
}, {} as Record<string, string>);
