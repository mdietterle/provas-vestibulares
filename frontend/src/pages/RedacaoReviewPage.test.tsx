import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import RedacaoReviewPage from './RedacaoReviewPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Prof', role: 'professor' }, logout: vi.fn() }),
}))

vi.mock('../api/redacoes', () => ({
  redacoesApi: {
    get: vi.fn().mockResolvedValue({
      data: {
        id: 1,
        theme: 'Redação Teste',
        status: 'ai_done',
        max_score: 1000,
        ai_total_score: 800,
        final_score: null,
        student: { id: 2, name: 'Aluno Teste' },
        professor: null,
        created_at: '2024-01-01T00:00:00Z',
        corrected_at: '2024-01-02T00:00:00Z',
        reviewed_at: null,
        body: 'Texto do aluno',
        rubric: null,
        ai_feedback: null,
        professor_comment: null,
        criteria_scores: [
          {
            id: 1,
            criterion: 'Competência 1',
            max_points: 200,
            ai_score: 160,
            ai_comment: 'Bom texto',
            final_score: null,
            professor_note: null,
            effective_score: 160,
          },
        ],
      },
    }),
    review: vi.fn().mockResolvedValue({ data: {} }),
    recorrect: vi.fn().mockResolvedValue({ data: { status: 'correcting' } }),
  },
}))

const { redacoesApi } = await import('../api/redacoes')

const renderWithProviders = (ui: React.ReactElement, initialEntry = '/redacoes/1/review') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ThemeProvider>
          <Routes>
            <Route path="/redacoes/:id/review" element={ui} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('RedacaoReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders review heading', async () => {
    renderWithProviders(<RedacaoReviewPage />)
    await waitFor(() => {
      expect(screen.getByText(/redação teste/i)).toBeInTheDocument()
    })
  })

  it('loads redação data on mount', async () => {
    renderWithProviders(<RedacaoReviewPage />)
    await waitFor(() => {
      expect(redacoesApi.get).toHaveBeenCalledWith(1)
    })
  })

  it('shows student text section', async () => {
    renderWithProviders(<RedacaoReviewPage />)
    await waitFor(() => {
      const matches = screen.getAllByText(/TEXTO DO ALUNO/i)
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })
  })
})