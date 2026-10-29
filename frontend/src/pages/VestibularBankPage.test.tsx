import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import VestibularBankPage from './VestibularBankPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}))
vi.mock('../components/AdSlot', () => ({ default: () => null }))
vi.mock('../api/vestibular', () => ({
  vestibularApi: {
    getExamTypes: vi.fn().mockResolvedValue([
      { value: 'fuvest', label: 'FUVEST' },
      { value: 'unicamp', label: 'UNICAMP' },
    ]),
    listQuestions: vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      size: 20,
    }),
    getYears: vi.fn().mockResolvedValue([]),
    getAreas: vi.fn().mockResolvedValue([]),
    getLanguages: vi.fn().mockResolvedValue([]),
  },
}))
vi.mock('../api', () => ({
  subjectsApi: {
    list: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] }),
  },
}))

const { vestibularApi } = await import('../api/vestibular')

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('VestibularBankPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(vestibularApi.listQuestions).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      size: 20,
    })
    vi.mocked(vestibularApi.getYears).mockResolvedValue([])
    vi.mocked(vestibularApi.getAreas).mockResolvedValue([])
    vi.mocked(vestibularApi.getLanguages).mockResolvedValue([])
  })

  it('renders heading for fuvest', async () => {
    renderWithProviders(<VestibularBankPage examType="fuvest" />)
    expect(screen.getByRole('heading', { name: /fuvest/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(vestibularApi.listQuestions).toHaveBeenCalledWith('fuvest', expect.anything())
    })
  })

  it('loads questions and filters on mount', async () => {
    renderWithProviders(<VestibularBankPage examType="fuvest" />)
    await waitFor(() => {
      expect(vestibularApi.listQuestions).toHaveBeenCalled()
      expect(vestibularApi.getYears).toHaveBeenCalledWith('fuvest')
      expect(vestibularApi.getAreas).toHaveBeenCalledWith('fuvest')
    })
  })

  it('shows empty state when no questions', async () => {
    renderWithProviders(<VestibularBankPage examType="fuvest" />)
    await waitFor(() => {
      expect(screen.getByText(/nenhuma questão encontrada/i)).toBeInTheDocument()
    })
  })

  it('renders questions when API returns data', async () => {
    vi.mocked(vestibularApi.listQuestions).mockResolvedValue({
      items: [{
        id: 1,
        exam_type: 'fuvest',
        exam_name: 'FUVEST',
        year: 2024,
        number: 1,
        statement: 'Questão teste Vestibular',
        is_annulled: false,
        metadata: {},
        options: [],
        images: [],
      }],
      total: 1,
      page: 1,
      size: 20,
    })
    renderWithProviders(<VestibularBankPage examType="fuvest" />)
    await waitFor(() => {
      expect(screen.getByText(/questão teste vestibular/i)).toBeInTheDocument()
    })
  })
})