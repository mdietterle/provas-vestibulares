import api from './client'
import type { Submission, SubmissionList } from '../types/submission'

export const submissionsApi = {
  submit: (examId: number, answers: { exam_question_id: number; selected_option_id?: number; essay_text?: string }[]) =>
    api.post<Submission>(`/submissions/exams/${examId}`, { answers }),

  listByExam: (examId: number) =>
    api.get<SubmissionList[]>(`/submissions/exams/${examId}`),

  get: (submissionId: number) =>
    api.get<Submission>(`/submissions/${submissionId}`),

  mySubmission: (examId: number) =>
    api.get<Submission>(`/submissions/my/${examId}`),

  overrideScore: (submissionId: number, answerId: number, score: number, feedback?: string) =>
    api.patch<Submission>(`/submissions/${submissionId}/answers/${answerId}`, {
      score,
      ai_feedback: feedback,
    }),

  correct: (submissionId: number) =>
    api.post<Submission>(`/submissions/${submissionId}/correct`),

  finalize: (submissionId: number) =>
    api.post<Submission>(`/submissions/${submissionId}/finalize`),

  correctAll: (examId: number) =>
    api.post<{ queued: number; submission_ids: number[] }>(`/submissions/exams/${examId}/correct-all`),

  release: (submissionId: number) =>
    api.post<Submission>(`/submissions/${submissionId}/release`),

  releaseAll: (examId: number) =>
    api.post<SubmissionList[]>(`/submissions/exams/${examId}/release-all`),

  aiCorrect: (submissionId: number, answerId: number) =>
    api.post<Submission>(`/submissions/${submissionId}/answers/${answerId}/ai-correct`),

  analytics: (examId: number) =>
    api.get(`/submissions/exams/${examId}/analytics`),

  ollamaStatus: () =>
    api.get<{ available: boolean; message: string }>('/submissions/ollama/status'),

  uploadScan: (examId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Submission>(`/submissions/exams/${examId}/upload-scan`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  professorUploadScan: (examId: number, file: File, studentId?: number) => {
    const form = new FormData()
    form.append('file', file)
    if (studentId) form.append('student_id', String(studentId))
    return api.post<Submission & {
      identified_student: { id: number; name: string } | null
      identification_method: string
      identification_confidence: string
    }>(`/submissions/exams/${examId}/professor-upload-scan`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
