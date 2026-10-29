import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import PucprBankPage from './PucprBankPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}))
vi.mock('../components/AdSlot', () => ({ default: () => null }))
vi.mock('../api', () => ({
  pucprApi: {
    years: vi.fn().mockResolvedValue({ data: [2024, 2023] }),
    areas: vi.fn().mockResolvedValue({ data: ['Matemática', 'Biologia'] }),
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
  subjectsApi: {
    list: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] }),
  },
}))

const { pucprApi, subjectsApi } = await import('../api')

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('PucprBankPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(pucprApi.years).mockResolvedValue({ data: [2024, 2023] })
    vi.mocked(pucprApi.areas).mockResolvedValue({ data: ['Matemática', 'Biologia'] })
    vi.mocked(subjectsApi.list).mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] })
    vi.mocked(pucprApi.list).mockResolvedValue({ data: [] })
  })

  it('renders heading and info banner', async () => {
    renderWithProviders(<PucprBankPage />)
    expect(screen.getByRole('heading', { name: /banco pucpr/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(pucprApi.list).toHaveBeenCalled()
    })
  })

  it('loads filters on mount', async () => {
    renderWithProviders(<PucprBankPage />)
    await waitFor(() => {
      expect(pucprApi.years).toHaveBeenCalled()
      expect(pucprApi.areas).toHaveBeenCalled()
      expect(subjectsApi.list).toHaveBeenCalled()
    })
  })

  it('shows empty state when no questions', async () => {
    renderWithProviders(<PucprBankPage />)
    await waitFor(() => {
      expect(screen.getByText(/nenhuma questão encontrada/i)).toBeInTheDocument()
    })
  })

  it('renders questions when API returns data', async () => {
    vi.mocked(pucprApi.list).mockResolvedValue({
      data: [{
        id: 1, exam_name: 'PUCPR', year: 2024, season: 'Verão',
        course: null, color: null, number: 1,
        area: 'Matemática', language: null,
        statement: 'Questão teste PUCPR', image_base64: null,
        options: [], created_at: '',
      }],
    })
    renderWithProviders(<PucprBankPage />)
    await waitFor(() => {
      expect(screen.getByText(/questão teste pucpr/i)).toBeInTheDocument()
    })
  })
})