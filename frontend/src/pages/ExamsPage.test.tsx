import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ExamsPage from './ExamsPage'

vi.mock('../api', () => ({
  classesApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
  examsApi: { list: vi.fn().mockResolvedValue({ data: [] }), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  questionsApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
  subjectsApi: { list: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] }) },
  usersApi: { assignments: vi.fn().mockResolvedValue({ data: [] }) },
}))

vi.mock('../api/vestibular', () => ({
  vestibularApi: { search: vi.fn().mockResolvedValue({ data: [] }) },
}))

vi.mock('../api/download', () => ({ downloadPdf: vi.fn() }))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin', institution_id: 1, is_active: true },
    logout: vi.fn(),
  }),
}))

vi.mock('../components/Modal', () => ({ default: ({ children, open }: any) => open ? <div>{children}</div> : null }))
vi.mock('../components/ConfirmDialog', () => ({ default: ({ open, onConfirm }: any) => open ? <button onClick={onConfirm}>Confirm</button> : null }))
vi.mock('../components/Pagination', () => ({ default: () => <div>Pagination</div> }))
vi.mock('../utils/pdf', () => ({ exportExams: vi.fn() }))
vi.mock('../utils/image', () => ({ resolveImageSrc: (v: string) => v || '' }))
vi.mock('react-router-dom', () => ({ Link: ({ children, to }: any) => <a href={to}>{children}</a> }))

describe('ExamsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders page title', async () => {
    render(<ExamsPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /provas/i })).toBeInTheDocument()
    })
  })

  it('loads exams and subjects on mount', async () => {
    const { examsApi, subjectsApi } = await import('../api')
    render(<ExamsPage />)
    await waitFor(() => {
      expect(examsApi.list).toHaveBeenCalled()
      expect(subjectsApi.list).toHaveBeenCalled()
    })
  })

  it('shows empty state when no exams exist', async () => {
    render(<ExamsPage />)
    await waitFor(() => {
      expect(screen.getByText(/nenhuma prova/i)).toBeInTheDocument()
    })
  })
})