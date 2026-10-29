import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import InvitationPage from './InvitationPage'

vi.mock('../api', () => ({
  invitationsApi: {
    verify: vi.fn().mockResolvedValue({
      data: { student_name: 'Ana Silva', email: 'ana@test.com', institution_name: 'Escola Teste' },
    }),
    accept: vi.fn().mockResolvedValue({ data: { message: 'OK' } }),
  },
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({ token: 'valid-token-123' }),
  useNavigate: () => vi.fn(),
}))

describe('InvitationPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders platform heading', async () => {
    render(<InvitationPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /plataforma de avaliações/i })).toBeInTheDocument()
    })
  })

  it('verifies invitation token on mount', async () => {
    const { invitationsApi } = await import('../api')
    render(<InvitationPage />)
    await waitFor(() => {
      expect(invitationsApi.verify).toHaveBeenCalledWith('valid-token-123')
    })
  })

  it('shows password form after successful verification', async () => {
    render(<InvitationPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/mínimo 6 caracteres/i)).toBeInTheDocument()
    })
  })
})