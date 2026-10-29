import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import ItaBankPage from './ItaBankPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}))
vi.mock('../components/AdSlot', () => ({ default: () => null }))
vi.mock('../api', () => ({
  itaApi: {
    years: vi.fn().mockResolvedValue({ data: [2024, 2023] }),
    areas: vi.fn().mockResolvedValue({ data: ['Matemática', 'Física'] }),
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
  subjectsApi: {
    list: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] }),
  },
}))

const { itaApi, subjectsApi } = await import('../api')

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('ItaBankPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(itaApi.years).mockResolvedValue({ data: [2024, 2023] })
    vi.mocked(itaApi.areas).mockResolvedValue({ data: ['Matemática', 'Física'] })
    vi.mocked(subjectsApi.list).mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] })
    vi.mocked(itaApi.list).mockResolvedValue({ data: [] })
  })

  it('renders heading and info banner', async () => {
    renderWithProviders(<ItaBankPage />)
    expect(screen.getByRole('heading', { name: /banco ita/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(itaApi.list).toHaveBeenCalled()
    })
  })

  it('loads filters on mount', async () => {
    renderWithProviders(<ItaBankPage />)
    await waitFor(() => {
      expect(itaApi.years).toHaveBeenCalled()
      expect(itaApi.areas).toHaveBeenCalled()
      expect(subjectsApi.list).toHaveBeenCalled()
    })
  })

  it('shows empty state when no questions', async () => {
    renderWithProviders(<ItaBankPage />)
    await waitFor(() => {
      expect(screen.getByText(/nenhuma questão encontrada/i)).toBeInTheDocument()
    })
  })

  it('renders questions when API returns data', async () => {
    vi.mocked(itaApi.list).mockResolvedValue({
      data: [{
        id: 1, exam_name: 'ITA', university: 'ITA', year: 2024,
        phase: '1ª Fase', number: 1, question_type: 'objetiva',
        area: 'Matemática', language: null,
        statement: 'Questão teste ITA', answer: null,
        image_base64: null, options: [], images: [], created_at: '',
      }],
    })
    renderWithProviders(<ItaBankPage />)
    await waitFor(() => {
      expect(screen.getByText(/questão teste ita/i)).toBeInTheDocument()
    })
  })
})