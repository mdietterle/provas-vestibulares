import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ProfessorsPage from './ProfessorsPage'

vi.mock('../api', () => ({
  classesApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
  subjectsApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
  usersApi: {
    list: vi.fn().mockResolvedValue({ data: [
      { id: 1, name: 'Prof Silva', email: 'prof@test.com', role: 'professor', is_active: true, institution_id: 1 },
    ] }),
    create: vi.fn(),
    update: vi.fn(),
    toggleActive: vi.fn(),
    delete: vi.fn(),
    assignments: vi.fn().mockResolvedValue({ data: [] }),
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
vi.mock('../utils/pdf', () => ({ exportProfessors: vi.fn() }))
vi.mock('react-router-dom', () => ({ Link: ({ children, to }: any) => <a href={to}>{children}</a> }))

describe('ProfessorsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders page title', async () => {
    render(<ProfessorsPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /professores/i })).toBeInTheDocument()
    })
  })

  it('loads professors on mount', async () => {
    const { usersApi } = await import('../api')
    render(<ProfessorsPage />)
    await waitFor(() => {
      expect(usersApi.list).toHaveBeenCalledWith('professor')
    })
  })

  it('displays loaded professors', async () => {
    render(<ProfessorsPage />)
    await waitFor(() => {
      expect(screen.getByText('Prof Silva')).toBeInTheDocument()
    })
  })
})