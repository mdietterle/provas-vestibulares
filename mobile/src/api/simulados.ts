import api from './client';

export type ExamType = 'enem' | 'acafe' | 'ufpr' | 'ufsc';
export type SimuladoStatus = 'pending' | 'correcting' | 'done';

export interface EnemScoreBreakdown {
  overall: number | null;
  by_area: Record<string, { correct: number; total: number; pct: number; score: number }>;
}

export interface SimuladoListItem {
  id: number;
  exam_type: ExamType;
  status: SimuladoStatus;
  total_score: number | null;
  enem_estimated_score: number | null;
  created_at: string;
  finished_at: string | null;
  question_count: number;
  areas: string[];
}

export interface SimuladoOption {
  id: number;
  letter: string;
  text: string;
  order: number;
  is_correct?: boolean;
}

export interface SimuladoQuestion {
  id: number;
  order: number;
  area: string;
  statement: string;
  image_base64: string | null;
  options: SimuladoOption[];
  selected_letter: string | null;
  is_correct?: boolean;
}

export interface SimuladoDetail {
  id: number;
  exam_type: ExamType;
  status: SimuladoStatus;
  total_score: number | null;
  enem_estimated_score: number | null;
  enem_score_breakdown: EnemScoreBreakdown | null;
  created_at: string;
  finished_at: string | null;
  question_count: number;
  questions: SimuladoQuestion[];
}

export interface TodaySimuladoStatus {
  has_simulado: boolean;
  simulado_id: number | null;
  exam_type: ExamType | null;
}

export const fetchSimulados = () => api.get<SimuladoListItem[]>('/simulados').then((r) => r.data);

export const fetchTodaySimuladoStatus = () =>
  api.get<TodaySimuladoStatus>('/simulados/today').then((r) => r.data);

export const createSimulado = (examType: ExamType) =>
  api.post<SimuladoDetail>('/simulados', { exam_type: examType }).then((r) => r.data);

export const fetchSimuladoResult = (id: number) =>
  api.get<SimuladoDetail>(`/simulados/${id}/result`).then((r) => r.data);

export const getSimulado = (id: number) => api.get<SimuladoDetail>(`/simulados/${id}`).then((r) => r.data);

export const submitSimulado = (
  id: number,
  answers: { simulado_question_id: number; selected_letter: string }[],
) => api.post<{ simulado_id: number; status: string }>(`/simulados/${id}/submit`, { answers }).then((r) => r.data);

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  enem: 'ENEM',
  acafe: 'ACAFE',
  ufpr: 'UFPR',
  ufsc: 'UFSC',
};
