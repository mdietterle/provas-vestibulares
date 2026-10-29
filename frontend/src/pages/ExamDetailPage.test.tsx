import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ExamDetailPage from './ExamDetailPage'

vi.mock('../api', () => ({
  classesApi: { listStudents: vi.fn().mockResolvedValue({ data: [] }) },
  examsApi: { get: vi.fn().mockResolvedValue({ data: { id: 1, title: 'Prova Detalhe', class_: { id: 1, name: 'Turma A' }, subject: { name: 'Matemática' }, created_by: { id: 1, name: 'Prof Teste' }, professor: { id: 1, name: 'Prof Teste' }, exam_questions: [] } }) },
}))
vi.mock('../api/submissions', () => ({
  submissionsApi: { professorUploadScan: vi.fn() },
}))
vi.mock('../api/download', () => ({ downloadBulkPdf: vi.fn(), downloadPdf: vi.fn() }))
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin', institution_id: 1, is_active: true },
    logout: vi.fn(),
  }),
}))
vi.mock('../utils/image', () => ({ resolveImageSrc: (v: string) => v || '' }))
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => vi.fn(),
}))

describe('ExamDetailPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders exam title after loading', async () => {
    render(<ExamDetailPage />)
    await waitFor(() => {
      expect(screen.getByText(/prova detalhe/i)).toBeInTheDocument()
    })
  })

  it('loads exam on mount', async () => {
    const { examsApi } = await import('../api')
    render(<ExamDetailPage />)
    await waitFor(() => {
      expect(examsApi.get).toHaveBeenCalledWith(1)
    })
  })
})