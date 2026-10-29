import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import RedacaoPage from './RedacaoPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Aluno', role: 'student' }, logout: vi.fn() }),
}))
vi.mock('../api/redacoes', () => ({
  redacoesApi: {
    get: vi.fn().mockResolvedValue({
      data: {
        id: 1,
        theme: 'Tema teste',
        status: 'reviewed',
        max_score: 1000,
        ai_total_score: 800,
        final_score: 900,
        student: { id: 1, name: 'Aluno Teste' },
        professor: { id: 2, name: 'Prof Teste' },
        created_at: '2024-01-01T00:00:00Z',
        corrected_at: '2024-01-02T00:00:00Z',
        reviewed_at: '2024-01-03T00:00:00Z',
        body: 'Texto do aluno',
        rubric: null,
        ai_feedback: null,
        professor_comment: null,
        criteria_scores: [],
      },
    }),
    submit: vi.fn().mockResolvedValue({ data: { id: 1 } }),
  },
}))

const { redacoesApi } = await import('../api/redacoes')

const renderWithProviders = (ui: React.ReactElement, initialEntry = '/redacoes/1') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ThemeProvider>
          <Routes>
            <Route path="/redacoes/:id" element={ui} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('RedacaoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders redação heading', async () => {
    renderWithProviders(<RedacaoPage />)
    await waitFor(() => {
      expect(screen.getByText(/tema teste/i)).toBeInTheDocument()
    })
  })

  it('loads redação data on mount', async () => {
    renderWithProviders(<RedacaoPage />)
    await waitFor(() => {
      expect(redacoesApi.get).toHaveBeenCalledWith(1)
    })
  })

  it('shows prompt text', async () => {
    renderWithProviders(<RedacaoPage />)
    await waitFor(() => {
      const matches = screen.getAllByText(/tema teste/i)
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })
  })
})