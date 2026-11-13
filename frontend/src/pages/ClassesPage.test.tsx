import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

vi.mock('../api/classJoinCode', () => ({
  classJoinCodeApi: {
    generate: vi.fn().mockResolvedValue({ data: { join_code: 'ABC123' } }),
    disable: vi.fn().mockResolvedValue({}),
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
vi.mock('../components/Modal', () => ({ default: ({ children }: any) => <div>{children}</div> }))
vi.mock('../components/ConfirmDialog', () => ({
  default: ({ open, onConfirm, message, confirmLabel }: any) => open ? (
    <div role="dialog"><p>{message}</p><button onClick={onConfirm}>{confirmLabel ?? 'Confirm'}</button></div>
  ) : null,
}))
vi.mock('../components/Pagination', () => ({ default: () => <div>Pagination</div> }))
vi.mock('../utils/pdf', () => ({ exportClasses: vi.fn() }))

const CLASSES = [
  { id: 1, name: '1 Ano EM', year: 2026, institution_id: 1, join_code: null },
  { id: 2, name: '1 Ano EM B', year: 2026, institution_id: 1, join_code: null },
]
const STUDENTS = [
  { id: 10, name: 'Aluno b', email: 'b@x.com', role: 'student', is_active: true, created_at: '', class_names: ['1 Ano EM · 2026'] },
  { id: 11, name: 'Aluno c', email: 'c@x.com', role: 'student', is_active: true, created_at: '', class_names: [] },
]

async function setupWithData() {
  const { classesApi, usersApi } = await import('../api')
  vi.mocked(classesApi.list).mockResolvedValue({ data: CLASSES } as any)
  vi.mocked(usersApi.list).mockImplementation(((role: string) =>
    Promise.resolve({ data: role === 'student' ? STUDENTS : [] })) as any)
  vi.mocked(classesApi.listAssignments).mockImplementation(((id: number) => Promise.resolve({
    data: id === 1
      ? [{ id: 1, professor_id: 5, subject_id: 1, class_id: 1, professor: { name: 'P' }, subject: { name: 'S' } },
         { id: 2, professor_id: 5, subject_id: 2, class_id: 1, professor: { name: 'P' }, subject: { name: 'S2' } }]
      : [],
  })) as any)
  return { classesApi }
}

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
    const { classesApi, usersApi } = await import('../api')
    vi.mocked(classesApi.list).mockResolvedValue({ data: [] } as any)
    vi.mocked(usersApi.list).mockResolvedValue({ data: [] } as any)
    render(<ClassesPage />)
    await waitFor(() => {
      expect(screen.getByText(/nenhuma turma/i)).toBeInTheDocument()
    })
  })

  it('shows student and professor counts on cards, with delete in the actions menu', async () => {
    await setupWithData()
    render(<ClassesPage />)
    expect(await screen.findByText('1 aluno')).toBeInTheDocument()
    expect(await screen.findByText('1 professor')).toBeInTheDocument()
    expect(screen.queryByTitle('Excluir turma')).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByLabelText('Ações da turma')[0])
    expect(screen.getByText('Excluir turma')).toBeInTheDocument()
  })

  it('asks for confirmation before enrolling a student already in a same-year class', async () => {
    const { classesApi } = await setupWithData()
    render(<ClassesPage />)
    await screen.findByText('1 Ano EM B')
    fireEvent.click(screen.getAllByText('Detalhes')[1])
    fireEvent.click(await screen.findByText(/^Alunos \(/))
    const select = await screen.findByLabelText(/matricular aluno/i)
    fireEvent.change(select, { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Matricular' }))

    expect(await screen.findByText(/Aluno b já está na turma 1 Ano EM · 2026/)).toBeInTheDocument()
    expect(classesApi.addStudent).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Matricular mesmo assim'))
    await waitFor(() => expect(classesApi.addStudent).toHaveBeenCalledWith(2, 10))
  })

  it('enrolls directly when there is no same-year conflict', async () => {
    const { classesApi } = await setupWithData()
    render(<ClassesPage />)
    await screen.findByText('1 Ano EM B')
    fireEvent.click(screen.getAllByText('Detalhes')[1])
    fireEvent.click(await screen.findByText(/^Alunos \(/))
    fireEvent.change(await screen.findByLabelText(/matricular aluno/i), { target: { value: '11' } })
    fireEvent.click(screen.getByRole('button', { name: 'Matricular' }))
    await waitFor(() => expect(classesApi.addStudent).toHaveBeenCalledWith(2, 11))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('generates a join code from the class detail', async () => {
    await setupWithData()
    const { classJoinCodeApi } = await import('../api/classJoinCode')
    render(<ClassesPage />)
    await screen.findByText('1 Ano EM B')
    fireEvent.click(screen.getAllByText('Detalhes')[0])
    expect(await screen.findByText(/O aluno usa este código para criar a conta/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Gerar código' }))
    await waitFor(() => expect(classJoinCodeApi.generate).toHaveBeenCalledWith(1))
    expect(await screen.findByTestId('join-code')).toHaveTextContent('ABC123')
    expect(screen.getByRole('button', { name: 'Gerar novo código' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Desativar' })).toBeInTheDocument()
  })
})
