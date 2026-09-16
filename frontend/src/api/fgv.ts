import api from './client'

export interface FgvOption {
  id: number
  letter: string
  text: string
  is_correct: boolean
  order: number
}

export interface FgvImage {
  id: number
  image_base64: string
  order: number
}

export interface FgvQuestion {
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
  options: FgvOption[]
  images: FgvImage[]
  created_at: string
}

export interface FgvImportRequest {
  fgv_question_id: number
  subject_id: number
  difficulty?: string
  is_public?: boolean
}

export interface FgvPdfImportResult {
  exam_name: string
  total_parsed: number
  total_added: number
  skipped_existing: number
}

export const fgvApi = {
  list: (params?: { year?: number; phase?: string; area?: string; search?: string; skip?: number; limit?: number }) =>
    api.get<FgvQuestion[]>('/fgv-questions', { params }),
  get: (id: number) => api.get<FgvQuestion>(`/fgv-questions/${id}`),
  years: () => api.get<number[]>('/fgv-questions/years'),
  areas: () => api.get<string[]>('/fgv-questions/areas'),
  importQuestion: (data: FgvImportRequest) => api.post('/fgv-questions/import', data),
  runImportAll: (since?: number, until?: number) => api.post('/fgv-questions/admin/import-all', undefined, { params: { since_year: since, until_year: until } }),
  importPdf: (form: FormData) =>
    api.post<FgvPdfImportResult>('/fgv-questions/admin/import-pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}
