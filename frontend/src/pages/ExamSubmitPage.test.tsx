import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ExamSubmitPage from './ExamSubmitPage'

vi.mock('../api', () => ({
  examsApi: {
    get: vi.fn().mockResolvedValue({
      data: {
        id: 1,
        title: 'Prova Submit',
        instructions: 'Leia com atenção',
        subject: { name: 'Matemática' },
        class_: { name: 'Turma A' },
        exam_questions: [
          { id: 1, order: 1, points: 5, question: { id: 10, statement: 'Questão 1', question_type: 'multiple_choice', options: [{ id: 1, text: 'A' }] } },
        ],
      },
    }),
  },
}))

vi.mock('../api/submissions', () => ({
  submissionsApi: {
    submit: vi.fn().mockResolvedValue({ data: {} }),
    mySubmission: vi.fn().mockRejectedValue({ response: { status: 404 } }),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Student', email: 'student@test.com', role: 'student', institution_id: 1, is_active: true },
    logout: vi.fn(),
  }),
}))

vi.mock('../utils/shuffle', () => ({ seededShuffle: (arr: any[]) => arr }))
vi.mock('../utils/questionSource', () => ({ extractSource: (s: string) => ({ statement: s, source: null }) }))
vi.mock('../utils/image', () => ({ resolveImageSrc: (v: string) => v || '' }))
vi.mock('../components/AdSlot', () => ({ default: () => null }))

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => vi.fn(),
}))

describe('ExamSubmitPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders exam title after loading', async () => {
    render(<ExamSubmitPage />)
    await waitFor(() => {
      expect(screen.getByText(/prova submit/i)).toBeInTheDocument()
    })
  })

  it('loads exam on mount', async () => {
    const { examsApi } = await import('../api')
    render(<ExamSubmitPage />)
    await waitFor(() => {
      expect(examsApi.get).toHaveBeenCalledWith(1)
    })
  })

  it('displays exam instructions', async () => {
    render(<ExamSubmitPage />)
    await waitFor(() => {
      expect(screen.getByText(/leia com atenção/i)).toBeInTheDocument()
    })
  })
})