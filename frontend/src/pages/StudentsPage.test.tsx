import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import StudentsPage from './StudentsPage'

vi.mock('../api', () => ({
  classesApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
  invitationsApi: {
    resend: vi.fn().mockResolvedValue({ data: {} }),
  },
  usersApi: {
    list: vi.fn().mockResolvedValue({ data: [
      { id: 1, name: 'Ana Silva', email: 'ana@test.com', role: 'student', is_active: true, institution_id: 1 },
      { id: 2, name: 'Bruno Santos', email: 'bruno@test.com', role: 'student', is_active: false, institution_id: 1 },
    ] }),
    toggleActive: vi.fn().mockResolvedValue({ data: {} }),
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
vi.mock('../components/Skeleton', () => ({ SkeletonTable: () => <div>Loading...</div> }))
vi.mock('../components/Pagination', () => ({ default: () => <div>Pagination</div> }))
vi.mock('../utils/pdf', () => ({ exportStudents: vi.fn() }))
vi.mock('react-router-dom', () => ({ Link: ({ children, to }: any) => <a href={to}>{children}</a> }))

describe('StudentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title', async () => {
    render(<StudentsPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^alunos$/i })).toBeInTheDocument()
    })
  })

  it('loads students on mount', async () => {
    const { usersApi } = await import('../api')
    render(<StudentsPage />)
    await waitFor(() => {
      expect(usersApi.list).toHaveBeenCalledWith('student')
    })
  })

  it('displays loaded students', async () => {
    render(<StudentsPage />)
    await waitFor(() => {
      expect(screen.getByText('Ana Silva')).toBeInTheDocument()
      expect(screen.getByText('Bruno Santos')).toBeInTheDocument()
    })
  })
})