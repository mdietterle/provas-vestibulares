import { API_BASE, CSRF_HEADERS } from './client'

async function fetchBlob(url: string): Promise<Blob> {
  // A sessão vai no cookie httpOnly; credentials: 'include' cobre também um
  // VITE_API_URL em outro host do mesmo site.
  const response = await fetch(url, { credentials: 'include', headers: { ...CSRF_HEADERS } })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const blob = await response.blob()
  // Guarda contra resposta HTML (ex.: SPA servida no lugar da API) salva como PDF corrompido.
  if (blob.type.includes('text/html')) {
    throw new Error('Resposta inválida do servidor (HTML em vez de arquivo)')
  }
  return blob
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadPdf(examId: number, filename: string) {
  const blob = await fetchBlob(`${API_BASE}/exams/${examId}/pdf`)
  triggerDownload(blob, filename)
}

export async function downloadStudentPdf(examId: number, studentId: number, filename: string) {
  const blob = await fetchBlob(`${API_BASE}/exams/${examId}/pdf?student_id=${studentId}`)
  triggerDownload(blob, filename)
}

export async function downloadXlsx(examId: number, filename: string) {
  const blob = await fetchBlob(`${API_BASE}/submissions/exams/${examId}/export`)
  triggerDownload(blob, filename)
}

export async function downloadBulkPdf(examId: number, filename: string) {
  const blob = await fetchBlob(`${API_BASE}/exams/${examId}/pdf/bulk`)
  triggerDownload(blob, filename)
}
