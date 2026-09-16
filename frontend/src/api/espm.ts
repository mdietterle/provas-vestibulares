import api from './client'

export interface EspmOption {
  id: number
  letter: string
  text: string
  is_correct: boolean
  order: number
}

export interface EspmImage {
  id: number
  image_base64: string
  order: number
}

export interface EspmQuestion {
  id: number
  exam_name: string
  university: string
  year: number
  phase: string | null
  number: number
  question_type: string
  area: string | null
  language: string | null
  statement: string
  answer: string | null
  image_base64: string | null
  options: EspmOption[]
  images: EspmImage[]
  created_at: string
}

export interface EspmImportRequest {
  espm_question_id: number
  subject_id: number
  difficulty?: string
  is_public?: boolean
}

export interface EspmPdfImportResult {
  exam_name: string
  total_parsed: number
  total_added: number
  skipped_existing: number
}

export const espmApi = {
  list: (params?: { year?: number; phase?: string; area?: string; search?: string; skip?: number; limit?: number }) =>
    api.get<EspmQuestion[]>('/espm-questions', { params }),
  get: (id: number) => api.get<EspmQuestion>(`/espm-questions/${id}`),
  years: () => api.get<number[]>('/espm-questions/years'),
  areas: () => api.get<string[]>('/espm-questions/areas'),
  importQuestion: (data: EspmImportRequest) => api.post('/espm-questions/import', data),
  runImportAll: (since?: number, until?: number) => api.post('/espm-questions/admin/import-all', undefined, { params: { since_year: since, until_year: until } }),
  importPdf: (form: FormData) =>
    api.post<EspmPdfImportResult>('/espm-questions/admin/import-pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}
