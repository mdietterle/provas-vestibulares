import type { ExamQuestion, User } from './index'

export type SubmissionStatus = 'pending' | 'correcting' | 'done' | 'released'

export interface SubmissionAnswer {
  id: number
  exam_question_id: number
  selected_option_id?: number
  essay_text?: string
  essay_image_base64?: string
  score?: number
  ai_feedback?: string
  is_auto_corrected: boolean
  exam_question: ExamQuestion
}

export interface Submission {
  id: number
  exam_id: number
  student_id: number
  status: SubmissionStatus
  total_score?: number
  submitted_at: string
  /** Quando o status virou 'correcting' pela última vez; null fora desse estado. */
  correcting_since?: string | null
  student: User
  answers: SubmissionAnswer[]
}

export interface SubmissionList {
  id: number
  exam_id: number
  student_id: number
  status: SubmissionStatus
  total_score?: number
  submitted_at: string
  correcting_since?: string | null
  student: User
}
