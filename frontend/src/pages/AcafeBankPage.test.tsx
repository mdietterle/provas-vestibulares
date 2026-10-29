import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import AcafeBankPage from './AcafeBankPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}))
vi.mock('../components/AdSlot', () => ({ default: () => null }))
vi.mock('../api', () => ({
  acafeApi: {
    years: vi.fn().mockResolvedValue({ data: [2024, 2023] }),
    periods: vi.fn().mockResolvedValue({ data: ['Verão', 'Inverno'] }),
    areas: vi.fn().mockResolvedValue({ data: ['Matemática', 'Física'] }),
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
  subjectsApi: {
    list: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] }),
  },
}))

const { acafeApi, subjectsApi } = await import('../api')

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('AcafeBankPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(acafeApi.years).mockResolvedValue({ data: [2024, 2023] })
    vi.mocked(acafeApi.periods).mockResolvedValue({ data: ['Verão', 'Inverno'] })
    vi.mocked(acafeApi.areas).mockResolvedValue({ data: ['Matemática', 'Física'] })
    vi.mocked(subjectsApi.list).mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] })
    vi.mocked(acafeApi.list).mockResolvedValue({ data: [] })
  })

  it('renders heading and info banner', async () => {
    renderWithProviders(<AcafeBankPage />)
    expect(screen.getByRole('heading', { name: /banco acafe/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(acafeApi.list).toHaveBeenCalled()
    })
  })

  it('loads filters on mount', async () => {
    renderWithProviders(<AcafeBankPage />)
    await waitFor(() => {
      expect(acafeApi.years).toHaveBeenCalled()
      expect(acafeApi.periods).toHaveBeenCalled()
      expect(acafeApi.areas).toHaveBeenCalled()
      expect(subjectsApi.list).toHaveBeenCalled()
    })
  })

  it('shows empty state when no questions', async () => {
    renderWithProviders(<AcafeBankPage />)
    await waitFor(() => {
      expect(screen.getByText(/nenhuma questão encontrada/i)).toBeInTheDocument()
    })
  })

  it('renders questions when API returns data', async () => {
    vi.mocked(acafeApi.list).mockResolvedValue({
      data: [{
        id: 1, exam_name: 'ACAFE', year: 2024, period: 'Verão',
        number: 1, area: 'Matemática', language: null,
        statement: 'Questão teste ACAFE', image_base64: null,
        justification: null, reference_matrix: null,
        options: [], images: [], created_at: '',
      }],
    })
    renderWithProviders(<AcafeBankPage />)
    await waitFor(() => {
      expect(screen.getByText(/questão teste acafe/i)).toBeInTheDocument()
    })
  })
})