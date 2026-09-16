import api from './client'

export interface UfprOption {
  id: number
  letter: string
  text: string
  is_correct: boolean
  order: number
}

export interface UfprImage {
  id: number
  image_base64: string
  order: number
}

export interface UfprQuestion {
  id: number
  exam_name: string
  university: string
  year: number
  number: number
  area: string | null
  language: string | null
  statement: string
  image_base64: string | null
  options: UfprOption[]
  images: UfprImage[]
  created_at: string
}

export interface UfprImportRequest {
  ufpr_question_id: number
  subject_id: number
  difficulty?: string
  is_public?: boolean
}

export const ufprApi = {
  list: (params?: { year?: number; area?: string; search?: string; skip?: number; limit?: number }) =>
    api.get<UfprQuestion[]>('/ufpr-questions', { params }),
  get: (id: number) => api.get<UfprQuestion>(`/ufpr-questions/${id}`),
  years: () => api.get<number[]>('/ufpr-questions/years'),
  areas: () => api.get<string[]>('/ufpr-questions/areas'),
  importQuestion: (data: UfprImportRequest) => api.post('/ufpr-questions/import', data),
  runSeed: (since?: number, until?: number) => api.post('/ufpr-questions/admin/run-seed', undefined, { params: { since_year: since, until_year: until } }),
}
