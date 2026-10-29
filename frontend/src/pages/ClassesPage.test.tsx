import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ClassesPage from './ClassesPage'

// Mock API modules
vi.mock('../api', () => ({
  classesApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: { id: 1, name: 'New Class', year: 2024 } }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({}),
    listStudents: vi.fn().mockResolvedValue({ data: [] }),
    addStudent: vi.fn().mockResolvedValue({}),
    removeStudent: vi.fn().mockResolvedValue({}),
    listAssignments: vi.fn().mockResolvedValue({ data: [] }),
    createAssignment: vi.fn().mockResolvedValue({ data: {} }),
    deleteAssignment: vi.fn().mockResolvedValue({}),
  },
  subjectsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
  usersApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    assignments: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin', institution_id: 1, is_active: true },
    logout: vi.fn(),
  }),
}))

// Mock components that may have complex dependencies
vi.mock('../components/Modal', () => ({ default: ({ children, open }: any) => open ? <div>{children}</div> : null }))
vi.mock('../components/ConfirmDialog', () => ({ default: ({ open, onConfirm }: any) => open ? <button onClick={onConfirm}>Confirm</button> : null }))
vi.mock('../components/Pagination', () => ({ default: () => <div>Pagination</div> }))
vi.mock('../utils/pdf', () => ({ exportClasses: vi.fn() }))

describe('ClassesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title', async () => {
    render(<ClassesPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^turmas$/i })).toBeInTheDocument()
    })
  })

  it('loads classes on mount', async () => {
    const { classesApi } = await import('../api')
    render(<ClassesPage />)
    await waitFor(() => {
      expect(classesApi.list).toHaveBeenCalled()
    })
  })

  it('shows empty state when no classes exist', async () => {
    render(<ClassesPage />)
    await waitFor(() => {
      expect(screen.getByText(/nenhuma turma/i)).toBeInTheDocument()
    })
  })
})