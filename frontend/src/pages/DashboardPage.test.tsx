import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import DashboardPage from './DashboardPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Prof Teste', role: 'professor' }, logout: vi.fn() }),
}))
vi.mock('../components/AdSlot', () => ({ default: () => null }))
vi.mock('../api', () => ({
  classesApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
  examsApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
  subjectsApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
  usersApi: { me: vi.fn().mockResolvedValue({ data: { id: 1, name: 'Prof Teste', role: 'professor' } }) },
  dashboardApi: {
    stats: vi.fn().mockResolvedValue({ data: {} }),
    monitoring: vi.fn().mockResolvedValue({ data: {} }),
    professor: vi.fn().mockResolvedValue({
      data: {
        total_students: 0,
        total_exams: 0,
        total_submissions: 0,
        average_score: null,
        recent_activity: [],
        subject_distribution: [],
      },
    }),
    student: vi.fn().mockResolvedValue({ data: {} }),
  },
}))
vi.mock('../api/submissions', () => ({
  submissionsApi: {
    listByExam: vi.fn().mockResolvedValue({ data: [] }),
    ollamaStatus: vi.fn().mockResolvedValue({ data: { available: true } }),
  },
}))

const { classesApi, examsApi, dashboardApi } = await import('../api')

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(classesApi.list).mockResolvedValue({ data: [] })
    vi.mocked(examsApi.list).mockResolvedValue({ data: [] })
    vi.mocked(dashboardApi.professor).mockResolvedValue({
      data: {
        total_students: 0,
        total_exams: 0,
        total_submissions: 0,
        average_score: null,
        recent_activity: [],
        subject_distribution: [],
      },
    })
  })

  it('renders professor greeting heading', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /olá, prof/i })).toBeInTheDocument()
    })
  })

  it('loads dashboard data on mount', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(dashboardApi.professor).toHaveBeenCalled()
      expect(examsApi.list).toHaveBeenCalled()
    })
  })

  it('shows manual do professor banner', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText(/manual do professor/i)).toBeInTheDocument()
    })
  })

  it('calls professor dashboard API for professor role', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(dashboardApi.professor).toHaveBeenCalledTimes(1)
    })
  })
})