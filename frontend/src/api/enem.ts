import api from './client'

export interface EnemOption {
  id: number
  letter: string
  text: string
  is_correct: boolean
  order: number
}

export interface EnemQuestion {
  id: number
  exam_name: string
  year: number
  number: number
  area: string | null
  language: string | null
  color: string | null
  module: string | null
  subject: string | null
  difficulty: string | null
  statement: string
  image_base64: string | null
  options: EnemOption[]
  created_at: string
}

export interface EnemImportRequest {
  enem_question_id: number
  subject_id: number
  difficulty?: string
  is_public?: boolean
}

export interface EnemPdfImportResult {
  ok: boolean
  exam_name: string
  color: string | null
  total_parsed: number
  total_added: number
  skipped_existing: number
  parse_errors: number[]
}

export const enemApi = {
  list: (params?: { year?: number; area?: string; search?: string; skip?: number; limit?: number }) =>
    api.get<EnemQuestion[]>('/enem-questions', { params }),
  get: (id: number) => api.get<EnemQuestion>(`/enem-questions/${id}`),
  years: () => api.get<number[]>('/enem-questions/years'),
  areas: () => api.get<string[]>('/enem-questions/areas'),
  importQuestion: (data: EnemImportRequest) => api.post('/enem-questions/import', data),
  runSeed: (since?: number, until?: number) => api.post('/enem-questions/admin/run-seed', undefined, { params: { since_year: since, until_year: until } }),
  runImportAll: (since?: number, until?: number) => api.post('/enem-questions/admin/import-all', undefined, { params: { since_year: since, until_year: until } }),
  importPdf: (form: FormData) =>
    api.post<EnemPdfImportResult>('/enem-questions/admin/import-pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}
