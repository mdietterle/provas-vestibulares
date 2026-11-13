import api from './client'
import type { Exam } from '../types'

/** Rascunho -> publicada (visível para a turma) e volta, enquanto não houver entregas. */
export const examPublishApi = {
  publish: (id: number) => api.post<Exam>(`/exams/${id}/publish`),
  unpublish: (id: number) => api.post<Exam>(`/exams/${id}/unpublish`),
}
