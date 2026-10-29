import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ForgotPasswordPage from './ForgotPasswordPage'

vi.mock('../api', () => ({
  authApi: {
    forgotPassword: vi.fn().mockResolvedValue({ data: { message: 'Email sent' } }),
  },
}))
vi.mock('../components/PublicHeader', () => ({ default: () => <div>Header</div> }))
vi.mock('../components/PublicFooter', () => ({ default: () => <div>Footer</div> }))
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}))

describe('ForgotPasswordPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders page heading', async () => {
    render(<ForgotPasswordPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /esqueceu sua senha/i })).toBeInTheDocument()
    })
  })

  it('renders email input field', () => {
    render(<ForgotPasswordPage />)
    expect(screen.getByPlaceholderText(/seu@email\.com/i)).toBeInTheDocument()
  })
})