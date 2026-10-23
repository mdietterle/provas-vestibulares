import api from './client'

export interface UploadPdfResult {
  ok: boolean
  exam_type: string
  exam_name?: string
  total_parsed?: number
  total_added?: number
  skipped_existing?: number
  parse_errors?: number[]
  color?: string | null
}

export const uploadPdfApi = {
  upload: (form: FormData) =>
    api.post<UploadPdfResult>('/upload-pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}