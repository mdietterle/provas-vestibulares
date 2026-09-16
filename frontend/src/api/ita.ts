import api from './client'

export interface ItaOption {
  id: number
  letter: string
  text: string
  is_correct: boolean
  order: number
}

export interface ItaImage {
  id: number
  image_base64: string
  order: number
}

export interface ItaQuestion {
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
  options: ItaOption[]
  images: ItaImage[]
  created_at: string
}

export interface ItaImportRequest {
  ita_question_id: number
  subject_id: number
  difficulty?: string
  is_public?: boolean
}

export interface ItaPdfImportResult {
  exam_name: string
  total_parsed: number
  total_added: number
  skipped_existing: number
}

export const itaApi = {
  list: (params?: { year?: number; phase?: string; area?: string; search?: string; skip?: number; limit?: number }) =>
    api.get<ItaQuestion[]>('/ita-questions', { params }),
  get: (id: number) => api.get<ItaQuestion>(`/ita-questions/${id}`),
  years: () => api.get<number[]>('/ita-questions/years'),
  areas: () => api.get<string[]>('/ita-questions/areas'),
  importQuestion: (data: ItaImportRequest) => api.post('/ita-questions/import', data),
  runImportAll: (since?: number, until?: number) => api.post('/ita-questions/admin/import-all', undefined, { params: { since_year: since, until_year: until } }),
  importPdf: (form: FormData) =>
    api.post<ItaPdfImportResult>('/ita-questions/admin/import-pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}
