import api from './client'

export interface CriterionScore {
  id: number
  criterion: string
  max_points: number
  ai_score: number | null
  ai_comment: string | null
  final_score: number | null
  professor_note: string | null
  effective_score: number | null
}

export interface RedacaoSummary {
  id: number
  theme: string
  status: 'pending' | 'correcting' | 'ai_done' | 'reviewed'
  max_score: number
  ai_total_score: number | null
  final_score: number | null
  student: { id: number; name: string }
  professor: { id: number; name: string } | null
  created_at: string
  corrected_at: string | null
  reviewed_at: string | null
}

export interface Redacao extends RedacaoSummary {
  body: string
  rubric: string | null
  ai_feedback: string | null
  professor_comment: string | null
  criteria_scores: CriterionScore[]
}

export interface SubmitRedacaoPayload {
  theme: string
  body: string
  rubric?: string
  max_score?: number
  professor_id?: number
}

export interface ReviewCriterionItem {
  criterion_score_id: number
  final_score: number
  professor_note?: string
}

export interface ReviewRedacaoPayload {
  criteria: ReviewCriterionItem[]
  professor_comment?: string
}

export const redacoesApi = {
  // Student
  submit: (data: SubmitRedacaoPayload) => api.post<Redacao>('/redacoes', data),
  mine: () => api.get<RedacaoSummary[]>('/redacoes/mine'),
  get: (id: number) => api.get<Redacao>(`/redacoes/${id}`),

  // Professor / admin
  list: (params?: { status?: string; student_id?: number }) =>
    api.get<RedacaoSummary[]>('/redacoes', { params }),
  review: (id: number, data: ReviewRedacaoPayload) =>
    api.put<Redacao>(`/redacoes/${id}/review`, data),
  recorrect: (id: number) => api.post<{ status: string }>(`/redacoes/${id}/recorrect`),
}
