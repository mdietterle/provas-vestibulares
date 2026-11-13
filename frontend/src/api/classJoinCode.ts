import api from './client'

/** Código de autocadastro da turma: o aluno informa ao criar a conta e já entra matriculado. */
export const classJoinCodeApi = {
  /** Gera (ou troca) o código da turma. */
  generate: (classId: number) =>
    api.post<{ join_code: string }>(`/classes/${classId}/join-code`),
  /** Desativa o código — novos cadastros não conseguem mais usá-lo. */
  disable: (classId: number) => api.delete(`/classes/${classId}/join-code`),
}
