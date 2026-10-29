import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import EnemBankPage from './EnemBankPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}))
vi.mock('../components/AdSlot', () => ({ default: () => null }))
vi.mock('../api', () => ({
  enemApi: {
    years: vi.fn().mockResolvedValue({ data: [2024, 2023] }),
    areas: vi.fn().mockResolvedValue({ data: ['Matemática', 'Linguagens'] }),
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
  subjectsApi: {
    list: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] }),
  },
}))

const { enemApi, subjectsApi } = await import('../api')

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('EnemBankPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(enemApi.years).mockResolvedValue({ data: [2024, 2023] })
    vi.mocked(enemApi.areas).mockResolvedValue({ data: ['Matemática', 'Linguagens'] })
    vi.mocked(subjectsApi.list).mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] })
    vi.mocked(enemApi.list).mockResolvedValue({ data: [] })
  })

  it('renders heading and info banner', async () => {
    renderWithProviders(<EnemBankPage />)
    expect(screen.getByRole('heading', { name: /banco enem/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(enemApi.list).toHaveBeenCalled()
    })
  })

  it('loads filters on mount', async () => {
    renderWithProviders(<EnemBankPage />)
    await waitFor(() => {
      expect(enemApi.years).toHaveBeenCalled()
      expect(enemApi.areas).toHaveBeenCalled()
      expect(subjectsApi.list).toHaveBeenCalled()
    })
  })

  it('shows empty state when no questions', async () => {
    renderWithProviders(<EnemBankPage />)
    await waitFor(() => {
      expect(screen.getByText(/nenhuma questão encontrada/i)).toBeInTheDocument()
    })
  })

  it('renders questions when API returns data', async () => {
    vi.mocked(enemApi.list).mockResolvedValue({
      data: [{
        id: 1, exam_name: 'ENEM', year: 2024, number: 1,
        area: 'Matemática', language: null, color: null,
        module: null, subject: null, difficulty: null,
        statement: 'Questão teste ENEM', image_base64: null,
        options: [], created_at: '',
      }],
    })
    renderWithProviders(<EnemBankPage />)
    await waitFor(() => {
      expect(screen.getByText(/questão teste enem/i)).toBeInTheDocument()
    })
  })
})