import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SubjectsPage from './SubjectsPage'

vi.mock('../api', () => ({
  subjectsApi: {
    list: vi.fn().mockResolvedValue({ data: [
      { id: 1, name: 'Matemática' },
      { id: 2, name: 'Português' },
    ] }),
    create: vi.fn().mockResolvedValue({ data: { id: 3, name: 'História' } }),
    update: vi.fn().mockResolvedValue({ data: { id: 1, name: 'Matemática Atualizada' } }),
    delete: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin', institution_id: 1, is_active: true },
    logout: vi.fn(),
  }),
}))

vi.mock('../components/Modal', () => ({ default: ({ children, open }: any) => open ? <div>{children}</div> : null }))
vi.mock('../components/ConfirmDialog', () => ({ default: ({ open, onConfirm }: any) => open ? <button onClick={onConfirm}>Confirm</button> : null }))
vi.mock('../components/Pagination', () => ({ default: () => <div>Pagination</div> }))
vi.mock('../utils/pdf', () => ({ exportSubjects: vi.fn() }))

describe('SubjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title', async () => {
    render(<SubjectsPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^matérias$/i })).toBeInTheDocument()
    })
  })

  it('loads subjects on mount', async () => {
    const { subjectsApi } = await import('../api')
    render(<SubjectsPage />)
    await waitFor(() => {
      expect(subjectsApi.list).toHaveBeenCalled()
    })
  })

  it('displays loaded subjects', async () => {
    render(<SubjectsPage />)
    await waitFor(() => {
      expect(screen.getByText('Matemática')).toBeInTheDocument()
      expect(screen.getByText('Português')).toBeInTheDocument()
    })
  })
})