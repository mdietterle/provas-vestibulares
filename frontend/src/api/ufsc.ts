import api from './client'

export interface UfscOption {
  id: number
  value: number
  text: string
  is_correct: boolean
  order: number
}

export interface UfscImage {
  id: number
  image_base64: string
  order: number
}

export interface UfscQuestion {
  id: number
  exam_name: string
  university: string
  year: number
  phase: string | null
  color: string | null
  number: number
  question_type: 'summation' | 'discursive'
  area: string | null
  language: string | null
  statement: string
  answer: number | null
  image_base64: string | null
  options: UfscOption[]
  images: UfscImage[]
  created_at: string
}

export interface UfscImportRequest {
  ufsc_question_id: number
  subject_id: number
  difficulty?: string
  is_public?: boolean
}

export interface UfscPdfImportResult {
  ok: boolean
  exam_name: string
  total_parsed: number
  total_added: number
  skipped_existing: number
}

export const ufscApi = {
  list: (params?: { year?: number; phase?: string; area?: string; question_type?: string; search?: string; skip?: number; limit?: number }) =>
    api.get<UfscQuestion[]>('/ufsc-questions', { params }),
  get: (id: number) => api.get<UfscQuestion>(`/ufsc-questions/${id}`),
  years: () => api.get<number[]>('/ufsc-questions/years'),
  areas: () => api.get<string[]>('/ufsc-questions/areas'),
  importQuestion: (data: UfscImportRequest) => api.post('/ufsc-questions/import', data),
  runSeed: (since?: number, until?: number, forceReimport = false, examName?: string) => api.post('/ufsc-questions/admin/run-seed', undefined, { params: { since_year: since, until_year: until, force_reimport: forceReimport, exam_name: examName } }),
  runImportAll: (since?: number, until?: number, forceReimport = false, examName?: string) => api.post('/ufsc-questions/admin/import-all', undefined, { params: { since_year: since, until_year: until, force_reimport: forceReimport, exam_name: examName } }),
  importPdf: (form: FormData, forceReimport = false) => {
    if (forceReimport) {
      form.append('force_reimport', 'true')
    }
    return api.post<UfscPdfImportResult>('/ufsc-questions/admin/import-pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getExamVersions: (year?: number) => api.get<string[]>(`/ufsc-questions/admin/exam-versions`, { params: { year } }),
}
