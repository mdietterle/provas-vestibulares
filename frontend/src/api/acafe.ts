import api from './client'

export interface AcafeOption {
  id: number
  letter: string
  text: string
  is_correct: boolean
  order: number
}

export interface AcafeImage {
  id: number
  image_base64: string
  order: number
}

export interface AcafeQuestion {
  id: number
  exam_name: string
  year: number
  period: string | null
  number: number
  area: string | null
  language: string | null
  statement: string
  image_base64: string | null
  justification: string | null
  reference_matrix: string | null
  options: AcafeOption[]
  images: AcafeImage[]
  created_at: string
}

export interface AcafeImportRequest {
  acafe_question_id: number
  subject_id: number
  difficulty?: string
  is_public?: boolean
}

export interface AcafeUrlImportRequest {
  url: string
  year: number
  period?: string
}

export interface AcafeUrlImportResult {
  exam_name: string
  total_parsed: number
  total_added: number
  skipped_existing: number
}

export const acafeApi = {
  list: (params?: { year?: number; period?: string; area?: string; search?: string; skip?: number; limit?: number }) =>
    api.get<AcafeQuestion[]>('/acafe-questions', { params }),
  get: (id: number) => api.get<AcafeQuestion>(`/acafe-questions/${id}`),
  years: () => api.get<number[]>('/acafe-questions/years'),
  periods: () => api.get<string[]>('/acafe-questions/periods'),
  areas: () => api.get<string[]>('/acafe-questions/areas'),
  importQuestion: (data: AcafeImportRequest) => api.post('/acafe-questions/import', data),
  runSeed: (since?: number, until?: number) => api.post('/acafe-questions/admin/run-seed', undefined, { params: { since_year: since, until_year: until } }),
  importUrl: (data: AcafeUrlImportRequest) => api.post<AcafeUrlImportResult>('/acafe-questions/admin/import-url', data),
}
