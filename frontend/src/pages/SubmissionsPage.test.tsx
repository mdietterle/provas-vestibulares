import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SubmissionsPage from './SubmissionsPage'

vi.mock('../api', () => ({
  classesApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    listStudents: vi.fn().mockResolvedValue({ data: [] }),
  },
  examsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    get: vi.fn().mockResolvedValue({ data: { id: 1, title: 'Prova Teste', subject_id: 1, class_id: 1, exam_questions: [], subject: { id: 1, name: 'Matemática' }, class_: { id: 1, name: '3º Ano', year: 2026 } } }),
  },
}))

vi.mock('../api/submissions', () => ({
  submissionsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    listByExam: vi.fn().mockResolvedValue({ data: [] }),
    get: vi.fn().mockResolvedValue({ data: {} }),
    grade: vi.fn().mockResolvedValue({ data: {} }),
    release: vi.fn().mockResolvedValue({ data: {} }),
    ollamaStatus: vi.fn().mockResolvedValue({ data: { available: true } }),
  },
}))

vi.mock('../api/download', () => ({ downloadXlsx: vi.fn() }))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin', institution_id: 1, is_active: true },
    logout: vi.fn(),
  }),
}))

vi.mock('../components/Modal', () => ({ default: ({ children, open }: any) => open ? <div>{children}</div> : null }))
vi.mock('../components/QuotaExceededModal', () => ({ default: () => null }))
vi.mock('../utils/pdf', () => ({ exportSubmissions: vi.fn() }))

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: '1' }),
}))

describe('SubmissionsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders page heading and exam subtitle after loading', async () => {
    render(<SubmissionsPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /submiss/i })).toBeInTheDocument()
      expect(screen.getByText(/prova teste/i)).toBeInTheDocument()
    })
  })

  it('loads exam and submissions on mount', async () => {
    const { examsApi } = await import('../api')
    const { submissionsApi } = await import('../api/submissions')
    render(<SubmissionsPage />)
    await waitFor(() => {
      expect(examsApi.get).toHaveBeenCalledWith(1)
      expect(submissionsApi.listByExam).toHaveBeenCalledWith(1)
      expect(submissionsApi.ollamaStatus).toHaveBeenCalled()
    })
  })
})