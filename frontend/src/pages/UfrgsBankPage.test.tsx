import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import UfrgsBankPage from './UfrgsBankPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}))
vi.mock('../components/AdSlot', () => ({ default: () => null }))
vi.mock('../api', () => ({
  ufrgsApi: {
    years: vi.fn().mockResolvedValue({ data: [2024, 2023] }),
    areas: vi.fn().mockResolvedValue({ data: ['Matemática', 'Física'] }),
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
  subjectsApi: {
    list: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] }),
  },
}))

const { ufrgsApi, subjectsApi } = await import('../api')

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('UfrgsBankPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ufrgsApi.years).mockResolvedValue({ data: [2024, 2023] })
    vi.mocked(ufrgsApi.areas).mockResolvedValue({ data: ['Matemática', 'Física'] })
    vi.mocked(subjectsApi.list).mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] })
    vi.mocked(ufrgsApi.list).mockResolvedValue({ data: [] })
  })

  it('renders heading and info banner', async () => {
    renderWithProviders(<UfrgsBankPage />)
    expect(screen.getByRole('heading', { name: /banco ufrgs/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(ufrgsApi.list).toHaveBeenCalled()
    })
  })

  it('loads filters on mount', async () => {
    renderWithProviders(<UfrgsBankPage />)
    await waitFor(() => {
      expect(ufrgsApi.years).toHaveBeenCalled()
      expect(ufrgsApi.areas).toHaveBeenCalled()
      expect(subjectsApi.list).toHaveBeenCalled()
    })
  })

  it('shows empty state when no questions', async () => {
    renderWithProviders(<UfrgsBankPage />)
    await waitFor(() => {
      expect(screen.getByText(/nenhuma questão encontrada/i)).toBeInTheDocument()
    })
  })

  it('renders questions when API returns data', async () => {
    vi.mocked(ufrgsApi.list).mockResolvedValue({
      data: [{
        id: 1, exam_name: 'UFRGS', year: 2024, day: 1,
        number: 1, area: 'Matemática',
        statement: 'Questão teste UFRGS', image_base64: null,
        options: [], created_at: '',
      }],
    })
    renderWithProviders(<UfrgsBankPage />)
    await waitFor(() => {
      expect(screen.getByText(/questão teste ufrgs/i)).toBeInTheDocument()
    })
  })
})