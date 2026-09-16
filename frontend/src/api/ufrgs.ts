import api from './client'

export interface UfrgsOption {
  id: number
  letter: string
  text: string
  is_correct: boolean
  order: number
}

export interface UfrgsQuestion {
  id: number
  exam_name: string
  year: number
  day: number
  number: number
  area: string | null
  statement: string
  image_base64: string | null
  options: UfrgsOption[]
  created_at: string
}

export interface UfrgsImportRequest {
  ufrgs_question_id: number
  subject_id: number
  difficulty?: string
  is_public?: boolean
}

export const ufrgsApi = {
  list: (params?: { year?: number; day?: number; area?: string; search?: string; skip?: number; limit?: number }) =>
    api.get<UfrgsQuestion[]>('/ufrgs-questions', { params }),
  get: (id: number) => api.get<UfrgsQuestion>(`/ufrgs-questions/${id}`),
  years: () => api.get<number[]>('/ufrgs-questions/years'),
  areas: () => api.get<string[]>('/ufrgs-questions/areas'),
  importQuestion: (data: UfrgsImportRequest) => api.post('/ufrgs-questions/import', data),
  runImportAll: (since?: number, until?: number) => api.post('/ufrgs-questions/admin/import-all', undefined, { params: { since_year: since, until_year: until } }),
}
