import { api } from './index'

export interface VestibularOption {
  id: number
  letter?: string | null
  value?: number | null
  text: string
  is_correct: boolean
  order: number
}

export interface VestibularImage {
  id: number
  image_base64: string
  order: number
}

export interface VestibularQuestion {
  id: number
  exam_type: string
  exam_name?: string | null
  year: number
  number: number
  statement: string
  html_statement?: string | null
  image_base64?: string | null
  answer?: string | null
  is_annulled: boolean
  correct_option?: string | null
  metadata: Record<string, any>
  created_at?: string | null
  options: VestibularOption[]
  images: VestibularImage[]
}

export interface VestibularQuestionList {
  items: VestibularQuestion[]
  total: number
  page: number
  size: number
}

export interface ExamTypeInfo {
  value: string
  label: string
}

export const vestibularApi = {
  getExamTypes: async (): Promise<ExamTypeInfo[]> => {
    const res = await api.get('/v2/vestibular-questions/exam-types')
    return res.data
  },

  listQuestions: async (
    examType: string,
    params?: { year?: number; area?: string; language?: string; search?: string; page?: number; size?: number }
  ): Promise<VestibularQuestionList> => {
    const res = await api.get(`/v2/vestibular-questions/${examType}`, { params })
    return res.data
  },

  getQuestion: async (examType: string, questionId: number): Promise<VestibularQuestion> => {
    const res = await api.get(`/v2/vestibular-questions/${examType}/${questionId}`)
    return res.data
  },

  getYears: async (examType: string): Promise<number[]> => {
    const res = await api.get(`/v2/vestibular-questions/${examType}/years`)
    return res.data
  },

  getAreas: async (examType: string): Promise<string[]> => {
    const res = await api.get(`/v2/vestibular-questions/${examType}/areas`)
    return res.data
  },

  getLanguages: async (examType: string): Promise<string[]> => {
    const res = await api.get(`/v2/vestibular-questions/${examType}/languages`)
    return res.data
  },
}