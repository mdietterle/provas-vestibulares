import api from './client'

export interface SimuladoOption {
  id: number
  letter: string
  text: string
  order: number
  is_correct?: boolean
  /** Só existe em questão tipo somatório (UFSC) — potência de 2 usada pra somar as marcadas. */
  value?: number
}

export interface SimuladoQuestionItem {
  id: number
  order: number
  area: string | null
  statement: string
  images: string[]
  options: SimuladoOption[]
  /** Alternativa única: uma letra (ex. "B"). Somatório: várias, separadas por vírgula (ex. "A,C,D"). */
  selected_letter: string | null
  is_correct?: boolean | null
  ai_feedback?: string | null
  /** "summation" (UFSC, marca várias e soma) | "single" (padrão, uma alternativa). */
  question_type?: string
}

export interface EnemScoreBreakdown {
  overall: number | null
  by_area: Record<string, { correct: number; total: number; pct: number; score: number }>
}

export interface SimuladoDetail {
  id: number
  exam_type: string
  status: 'pending' | 'correcting' | 'done' | 'error'
  total_score: number | null
  enem_estimated_score: number | null
  enem_score_breakdown: EnemScoreBreakdown | null
  current_index: number
  created_at: string
  finished_at: string | null
  question_count: number
  questions: SimuladoQuestionItem[]
}

export interface SimuladoSummary {
  id: number
  exam_type: string
  status: 'pending' | 'correcting' | 'done' | 'error'
  total_score: number | null
  enem_estimated_score: number | null
  created_at: string
  finished_at: string | null
  question_count: number
  areas: string[]
}

export interface SimuladoTodayResponse {
  has_simulado: boolean
  simulado_id: number | null
  exam_type: string | null
  status: string | null
}

export interface SimuladoDashboard {
  total_simulados: number
  completed_simulados: number
  average_score: number | null
  best_score: number | null
  simulados_this_week: number
  by_exam_type: Record<string, { count: number; avg_score: number | null }>
  by_area: Record<string, { total: number; correct: number; pct: number }>
  recent_simulados: { id: number; exam_type: string; created_at: string; total_score: number | null; status: string }[]
}

export interface CreateSimuladoRequest {
  exam_type: string
  area?: string
  num_questions?: number
}

export const SIMULADO_MAX_QUESTIONS = 50

export const simuladosApi = {
  create: (data: CreateSimuladoRequest) =>
    api.post<SimuladoDetail>('/simulados', data),
  list: () =>
    api.get<SimuladoSummary[]>('/simulados'),
  today: () =>
    api.get<SimuladoTodayResponse>('/simulados/today'),
  areas: (exam_type: string) =>
    api.get<string[]>('/simulados/areas', { params: { exam_type } }),
  get: (id: number) =>
    api.get<SimuladoDetail>(`/simulados/${id}`),
  progress: (id: number, current_index: number, answers?: { simulado_question_id: number; selected_letter: string }[]) =>
    api.patch<{ status: string }>(`/simulados/${id}/progress`, { current_index, answers }),
  submit: async (id: number, answers: { simulado_question_id: number; selected_letter: string }[]) => {
    const res = await api.post<{ simulado_id: number; status: string }>(`/simulados/${id}/submit`, { answers })
    return res.data
  },
  formatQuestion: async (questionId: number) => {
    const res = await api.post<{ id: number, formatted_statement: string }>(`/simulados/questions/${questionId}/format`)
    return res.data
  },
  reportReasons: () =>
    api.get<{ value: string; label: string }[]>('/simulados/report-reasons'),
  reportQuestion: (sqId: number, reason: string, details?: string) =>
    api.post<{ id: number; status: string }>(`/simulados/questions/${sqId}/report`, { reason, details }),
  result: (id: number) =>
    api.get<SimuladoDetail>(`/simulados/${id}/result`),
  dashboard: () =>
    api.get<SimuladoDashboard>('/simulados/dashboard'),
}
