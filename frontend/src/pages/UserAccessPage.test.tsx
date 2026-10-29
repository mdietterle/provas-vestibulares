import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import UserAccessPage from './UserAccessPage'

vi.mock('../api', () => ({
  usersApi: {
    list: vi.fn().mockResolvedValue({ data: [
      { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin', is_active: true, institution_id: 1 },
    ] }),
    toggleActive: vi.fn().mockResolvedValue({ data: {} }),
  },
  invitationsApi: {
    resend: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin', institution_id: 1, is_active: true },
    logout: vi.fn(),
  }),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))

describe('UserAccessPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders access heading', async () => {
    render(<UserAccessPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /acesso/i })).toBeInTheDocument()
    })
  })

  it('loads users on mount', async () => {
    const { usersApi } = await import('../api')
    render(<UserAccessPage />)
    await waitFor(() => {
      expect(usersApi.list).toHaveBeenCalled()
    })
  })
})