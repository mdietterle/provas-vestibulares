import api from './client'

export interface PucprOption {
  id: number
  letter: string
  text: string
  is_correct: boolean
  order: number
}

export interface PucprQuestion {
  id: number
  exam_name: string
  year: number
  season: string | null
  course: string | null
  color: string | null
  number: number
  area: string | null
  language: string | null
  statement: string
  image_base64: string | null
  options: PucprOption[]
  created_at: string
}

export interface PucprImportRequest {
  pucpr_question_id: number
  subject_id: number
  difficulty?: string
  is_public?: boolean
}

export interface PucprUrlImportRequest {
  url: string
  year: number
  season?: string
  course?: string
  color?: string
  gabarito_text: string
}

export interface PucprUrlImportResult {
  exam_name: string
  total_parsed: number
  total_added: number
  skipped_existing: number
  skipped_unparsed: number[]
  gabarito_entries: number
}

export const pucprApi = {
  list: (params?: { year?: number; season?: string; course?: string; area?: string; search?: string; skip?: number; limit?: number }) =>
    api.get<PucprQuestion[]>('/pucpr-questions', { params }),
  get: (id: number) => api.get<PucprQuestion>(`/pucpr-questions/${id}`),
  years: () => api.get<number[]>('/pucpr-questions/years'),
  areas: () => api.get<string[]>('/pucpr-questions/areas'),
  importQuestion: (data: PucprImportRequest) => api.post('/pucpr-questions/import', data),
  importUrl: (data: PucprUrlImportRequest) => api.post<PucprUrlImportResult>('/pucpr-questions/admin/import-url', data),
  runImportAll: (since?: number, until?: number) => api.post('/pucpr-questions/admin/import-all', undefined, { params: { since_year: since, until_year: until } }),
}
