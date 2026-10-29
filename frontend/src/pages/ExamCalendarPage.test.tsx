import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import ExamCalendarPage from './ExamCalendarPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    logout: vi.fn(),
  }),
}))
vi.mock('../components/AdSlot', () => ({ default: () => null }))

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>
  )

describe('ExamCalendarPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders calendar heading', () => {
    renderWithProviders(<ExamCalendarPage />)
    expect(screen.getByRole('heading', { name: /calendário de vestibulares/i })).toBeInTheDocument()
  })

  it('renders upcoming exams section', () => {
    renderWithProviders(<ExamCalendarPage />)
    expect(screen.getByText(/próximas edições/i)).toBeInTheDocument()
  })
})