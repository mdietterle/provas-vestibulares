import api from './client'

export interface ProfessorCsvRowError {
  row: number
  email?: string | null
  message: string
}

export interface ProfessorCsvImportResult {
  created: number
  skipped: number
  errors: ProfessorCsvRowError[]
  dry_run?: boolean
}

/**
 * Importa professores via CSV (nome, email, materias, turmas).
 * Com dryRun=true só valida e devolve o resumo, sem gravar nem enviar convites.
 */
export const importProfessorsCsv = (file: File, dryRun = false) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<ProfessorCsvImportResult>('/users/professors/import-csv', formData, {
    params: { dry_run: dryRun },
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
