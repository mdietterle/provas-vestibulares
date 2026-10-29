import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import CorrectionsPage from './CorrectionsPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}))
vi.mock('../components/AdSlot', () => ({ default: () => null }))
vi.mock('../utils/pdf', () => ({ exportCorrections: vi.fn() }))
vi.mock('../api', () => ({
  classesApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
  examsApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
}))
vi.mock('../api/submissions', () => ({
  submissionsApi: {
    listByExam: vi.fn().mockResolvedValue({ data: [] }),
    ollamaStatus: vi.fn().mockResolvedValue({ data: { available: true } }),
  },
}))

const { classesApi, examsApi } = await import('../api')
const { submissionsApi } = await import('../api/submissions')

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('CorrectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(classesApi.list).mockResolvedValue({ data: [] })
    vi.mocked(examsApi.list).mockResolvedValue({ data: [] })
    vi.mocked(submissionsApi.ollamaStatus).mockResolvedValue({ data: { available: true } })
  })

  it('renders heading', async () => {
    renderWithProviders(<CorrectionsPage />)
    expect(screen.getByRole('heading', { name: /correções/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(classesApi.list).toHaveBeenCalled()
    })
  })

  it('loads classes and exams on mount', async () => {
    renderWithProviders(<CorrectionsPage />)
    await waitFor(() => {
      expect(classesApi.list).toHaveBeenCalled()
      expect(examsApi.list).toHaveBeenCalled()
      expect(submissionsApi.ollamaStatus).toHaveBeenCalled()
    })
  })

  it('shows zero turmas when no classes', async () => {
    renderWithProviders(<CorrectionsPage />)
    await waitFor(() => {
      expect(screen.getByText(/0 turmas disponíveis/i)).toBeInTheDocument()
    })
  })

  it('displays AI status pill', async () => {
    renderWithProviders(<CorrectionsPage />)
    await waitFor(() => {
      expect(screen.getByText(/ia online/i)).toBeInTheDocument()
    })
  })
})