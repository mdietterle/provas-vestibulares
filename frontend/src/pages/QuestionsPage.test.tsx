import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import QuestionsPage from './QuestionsPage'

vi.mock('../api', () => ({
  questionsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({}),
  },
  subjectsApi: {
    list: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Matemática' }] }),
  },
  usersApi: {
    assignments: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Professor', email: 'prof@test.com', role: 'professor', institution_id: 1, is_active: true },
    logout: vi.fn(),
  }),
}))

vi.mock('../components/ConfirmDialog', () => ({ default: ({ open, onConfirm }: any) => open ? <button onClick={onConfirm}>Confirm</button> : null }))
vi.mock('../components/Pagination', () => ({ default: () => <div>Pagination</div> }))
vi.mock('../utils/pdf', () => ({ exportQuestions: vi.fn() }))
vi.mock('./questions/QuestionCard', () => ({ default: () => <div>QuestionCard</div> }))
vi.mock('./questions/QuestionFormModal', () => ({ default: () => null }))
vi.mock('./questions/AiGenerateModal', () => ({ default: () => null }))
vi.mock('./questions/AiInsightsPanel', () => ({ default: () => null }))

describe('QuestionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title', async () => {
    render(<QuestionsPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /banco de questões/i })).toBeInTheDocument()
    })
  })

  it('loads questions and subjects on mount', async () => {
    const { questionsApi, subjectsApi } = await import('../api')
    render(<QuestionsPage />)
    await waitFor(() => {
      expect(questionsApi.list).toHaveBeenCalled()
      expect(subjectsApi.list).toHaveBeenCalled()
    })
  })

  it('shows empty state when no questions exist', async () => {
    render(<QuestionsPage />)
    await waitFor(() => {
      expect(screen.getByText(/nenhuma questão/i)).toBeInTheDocument()
    })
  })
})