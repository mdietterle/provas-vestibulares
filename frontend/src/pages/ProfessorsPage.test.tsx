import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

vi.mock('../api/professorsCsv', () => ({
  importProfessorsCsv: vi.fn((_file: File, dryRun: boolean) => Promise.resolve({
    data: dryRun
      ? { created: 2, skipped: 1, errors: [{ row: 3, email: 'dup@x.com', message: 'E-mail já cadastrado — linha ignorada' }], dry_run: true }
      : { created: 2, skipped: 1, errors: [{ row: 3, email: 'dup@x.com', message: 'E-mail já cadastrado — linha ignorada' }] },
  })),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin', institution_id: 1, is_active: true },
    logout: vi.fn(),
  }),
}))

vi.mock('../components/Modal', () => ({ default: ({ children }: any) => <div>{children}</div> }))
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

  it('imports professors from CSV: verifies first, then imports and shows the summary', async () => {
    const { importProfessorsCsv } = await import('../api/professorsCsv')
    render(<ProfessorsPage />)
    fireEvent.click(await screen.findByRole('button', { name: /importar csv/i }))
    const file = new File(['nome,email\nA,a@x.com\n'], 'prof.csv', { type: 'text/csv' })
    fireEvent.change(document.getElementById('csv-upload-prof')!, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: /verificar arquivo/i }))

    await waitFor(() => expect(importProfessorsCsv).toHaveBeenCalledWith(file, true))
    expect(await screen.findByText('Serão criados')).toBeInTheDocument()
    expect(screen.getByText(/Linha 3 \(dup@x.com\): E-mail já cadastrado/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /importar 2 professores/i }))
    await waitFor(() => expect(importProfessorsCsv).toHaveBeenCalledWith(file, false))
    expect(await screen.findByText('Criados')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /concluir/i })).toBeInTheDocument()
  })
})
