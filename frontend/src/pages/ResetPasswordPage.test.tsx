import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ResetPasswordPage from './ResetPasswordPage'

vi.mock('../api', () => ({
  authApi: {
    verifyResetToken: vi.fn().mockResolvedValue({ data: { valid: true, name: 'User', email: 'user@test.com' } }),
    resetPassword: vi.fn().mockResolvedValue({ data: { message: 'OK' } }),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    logout: vi.fn(),
  }),
}))

vi.mock('../components/PublicHeader', () => ({ default: () => <div>Header</div> }))
vi.mock('../components/PublicFooter', () => ({ default: () => <div>Footer</div> }))

vi.mock('react-router-dom', () => ({
  useParams: () => ({ token: 'reset-token-abc' }),
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))

describe('ResetPasswordPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders reset password heading', async () => {
    render(<ResetPasswordPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /plataforma de avaliações/i })).toBeInTheDocument()
    })
  })

  it('verifies reset token on mount', async () => {
    const { authApi } = await import('../api')
    render(<ResetPasswordPage />)
    await waitFor(() => {
      expect(authApi.verifyResetToken).toHaveBeenCalledWith('reset-token-abc')
    })
  })
})