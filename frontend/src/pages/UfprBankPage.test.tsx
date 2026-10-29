import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import UfprBankPage from './UfprBankPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}))
vi.mock('../components/AdSlot', () => ({ default: () => null }))
vi.mock('../api', () => ({
  ufprApi: {
    years: vi.fn().mockResolvedValue({ data: [2024, 2023] }),
    areas: vi.fn().mockResolvedValue({ data: ['Matemática', 'Física'] }),
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
  subjectsApi: {
    list: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] }),
  },
}))

const { ufprApi, subjectsApi } = await import('../api')

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('UfprBankPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ufprApi.years).mockResolvedValue({ data: [2024, 2023] })
    vi.mocked(ufprApi.areas).mockResolvedValue({ data: ['Matemática', 'Física'] })
    vi.mocked(subjectsApi.list).mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] })
    vi.mocked(ufprApi.list).mockResolvedValue({ data: [] })
  })

  it('renders heading and info banner', async () => {
    renderWithProviders(<UfprBankPage />)
    expect(screen.getByRole('heading', { name: /banco ufpr/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(ufprApi.list).toHaveBeenCalled()
    })
  })

  it('loads filters on mount', async () => {
    renderWithProviders(<UfprBankPage />)
    await waitFor(() => {
      expect(ufprApi.years).toHaveBeenCalled()
      expect(ufprApi.areas).toHaveBeenCalled()
      expect(subjectsApi.list).toHaveBeenCalled()
    })
  })

  it('shows empty state when no questions', async () => {
    renderWithProviders(<UfprBankPage />)
    await waitFor(() => {
      expect(screen.getByText(/nenhuma questão encontrada/i)).toBeInTheDocument()
    })
  })

  it('renders questions when API returns data', async () => {
    vi.mocked(ufprApi.list).mockResolvedValue({
      data: [{
        id: 1, exam_name: 'UFPR', university: 'UFPR', year: 2024,
        number: 1, area: 'Matemática', language: null,
        statement: 'Questão teste UFPR', image_base64: null,
        options: [], images: [], created_at: '',
      }],
    })
    renderWithProviders(<UfprBankPage />)
    await waitFor(() => {
      expect(screen.getByText(/questão teste ufpr/i)).toBeInTheDocument()
    })
  })
})