// Mesmo fallback de client.ts: em produção usa o backend do Render,
// em dev usa o proxy /api do Vite. Evita baixar o index.html da SPA como PDF.
const API_ORIGIN = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://provas-khsq.onrender.com' : '')

const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api` : '/api'

async function fetchBlob(url: string): Promise<Blob> {
  const token = localStorage.getItem('token')
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
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
