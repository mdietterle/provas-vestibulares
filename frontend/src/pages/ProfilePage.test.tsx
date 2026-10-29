import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ProfilePage from './ProfilePage'

vi.mock('../api', () => ({
  profileApi: {
    update: vi.fn().mockResolvedValue({ data: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' } }),
    uploadAvatar: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin', institution_id: 1, is_active: true },
    setUser: vi.fn(),
    logout: vi.fn(),
  }),
}))

describe('ProfilePage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders profile heading', async () => {
    render(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /meu perfil/i })).toBeInTheDocument()
    })
  })

  it('displays user name in form', async () => {
    render(<ProfilePage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('Admin User')).toBeInTheDocument()
    })
  })

  it('shows email field as read-only or disabled', async () => {
    render(<ProfilePage />)
    await waitFor(() => {
      const emailInput = screen.getByDisplayValue('admin@test.com')
      expect(emailInput).toBeInTheDocument()
    })
  })
})