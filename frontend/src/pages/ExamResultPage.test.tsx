import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ExamResultPage from './ExamResultPage'

vi.mock('../api/submissions', () => ({
  submissionsApi: {
    mySubmission: vi.fn().mockResolvedValue({
      data: {
        id: 1,
        total_score: 8,
        answers: [
          { id: 1, score: 5, exam_question: { points: 5, question: { statement: 'Q1', question_type: 'multiple_choice', options: [{ id: 1, text: 'A', order: 1 }] } } },
          { id: 2, score: 3, exam_question: { points: 5, question: { statement: 'Q2', question_type: 'essay', options: [] } } },
        ],
      },
    }),
  },
}))

vi.mock('../utils/pdf', () => ({ exportStudentResult: vi.fn() }))
vi.mock('../utils/questionSource', () => ({ extractSource: (s: string) => ({ statement: s, source: null }) }))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Student', email: 'student@test.com', role: 'student', institution_id: 1, is_active: true },
    logout: vi.fn(),
  }),
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))

describe('ExamResultPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders result text after loading', async () => {
    render(<ExamResultPage />)
    await waitFor(() => {
      expect(screen.getByText(/resultado da prova/i)).toBeInTheDocument()
    })
  })

  it('loads submission on mount', async () => {
    const { submissionsApi } = await import('../api/submissions')
    render(<ExamResultPage />)
    await waitFor(() => {
      expect(submissionsApi.mySubmission).toHaveBeenCalledWith(1)
    })
  })

  it('shows not-released message when 403', async () => {
    const { submissionsApi } = await import('../api/submissions')
    submissionsApi.mySubmission.mockRejectedValueOnce({ response: { status: 403 } })
    render(<ExamResultPage />)
    await waitFor(() => {
      expect(screen.getByText(/aguardando liberação/i)).toBeInTheDocument()
    })
  })
})