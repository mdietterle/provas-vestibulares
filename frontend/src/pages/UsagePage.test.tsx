import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import UsagePage from './UsagePage'

vi.mock('../api', () => ({
  usageApi: {
    summary: vi.fn().mockResolvedValue({
      data: {
        totals: { ai_generation: 10, ai_correction: 5 },
        limits_per_professor: { ai_generation: 100, ai_correction: 100 },
        professors: { active: 2 },
        plan: { label: 'Pro' },
        per_professor: [],
      },
    }),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin', institution_id: 1, is_active: true },
    logout: vi.fn(),
  }),
}))

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>)

describe('UsagePage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders usage heading', async () => {
    renderWithRouter(<UsagePage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /uso & limites/i })).toBeInTheDocument()
    })
  })

  it('loads usage summary on mount', async () => {
    const { usageApi } = await import('../api')
    renderWithRouter(<UsagePage />)
    await waitFor(() => {
      expect(usageApi.summary).toHaveBeenCalled()
    })
  })
})