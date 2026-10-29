import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import ExamAnalyticsPage from './ExamAnalyticsPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Prof', role: 'professor' }, logout: vi.fn() }),
}))
vi.mock('../components/AdSlot', () => ({ default: () => null }))
vi.mock('../utils/pdf', () => ({ exportAnalytics: vi.fn() }))
vi.mock('../api/submissions', () => ({
  submissionsApi: {
    analytics: vi.fn().mockResolvedValue({
      data: {
        exam_id: 1,
        exam_title: 'Prova Teste',
        total_points: 10,
        total_enrolled: 30,
        total_submitted: 25,
        corrected_count: 20,
        average_score: 6.5,
        median_score: 7,
        highest_score: 10,
        lowest_score: 2,
        std_dev: 1.5,
        pass_rate: 0.7,
        score_distribution: [],
        question_stats: [],
        plagiarism_alerts: [],
      },
    }),
  },
}))

const { submissionsApi } = await import('../api/submissions')

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/exams/1/analytics']}>
        <ThemeProvider>
          <Routes>
            <Route path="/exams/:id/analytics" element={ui} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('ExamAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(submissionsApi.analytics).mockResolvedValue({
      data: {
        exam_id: 1,
        exam_title: 'Prova Teste',
        total_points: 10,
        total_enrolled: 30,
        total_submitted: 25,
        corrected_count: 20,
        average_score: 6.5,
        median_score: 7,
        highest_score: 10,
        lowest_score: 2,
        std_dev: 1.5,
        pass_rate: 0.7,
        score_distribution: [],
        question_stats: [],
        plagiarism_alerts: [],
      },
    })
  })

  it('renders analytics heading', async () => {
    renderWithProviders(<ExamAnalyticsPage />)
    await waitFor(() => {
      expect(screen.getByText(/prova teste/i)).toBeInTheDocument()
    })
  })

  it('loads analytics on mount', async () => {
    renderWithProviders(<ExamAnalyticsPage />)
    await waitFor(() => {
      expect(submissionsApi.analytics).toHaveBeenCalledWith(1)
    })
  })

  it('shows stat cards', async () => {
    renderWithProviders(<ExamAnalyticsPage />)
    await waitFor(() => {
      expect(screen.getByText(/média/i)).toBeInTheDocument()
    })
  })

  it('displays submission count', async () => {
    renderWithProviders(<ExamAnalyticsPage />)
    await waitFor(() => {
      expect(screen.getByText(/25/i)).toBeInTheDocument()
    })
  })
})