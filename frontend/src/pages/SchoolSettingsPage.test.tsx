import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SchoolSettingsPage from './SchoolSettingsPage'

vi.mock('../api', () => ({
  institutionsApi: {
    list: vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Escola Teste', cnpj: '00.000.000/0001-00' }] }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    uploadLogo: vi.fn().mockResolvedValue({ data: {} }),
    removeLogo: vi.fn().mockResolvedValue({ data: {} }),
  },
  usageApi: {
    summary: vi.fn().mockResolvedValue({ data: { totals: { ai_generation: 0, ai_correction: 0 }, limits_per_professor: {}, professors: { active: 1 }, plan: { label: 'Básico' } } }),
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

describe('SchoolSettingsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders page heading', async () => {
    render(<SchoolSettingsPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^configurações$/i })).toBeInTheDocument()
    })
  })

  it('loads institution data on mount', async () => {
    const { institutionsApi } = await import('../api')
    render(<SchoolSettingsPage />)
    await waitFor(() => {
      expect(institutionsApi.list).toHaveBeenCalled()
    })
  })

  it('displays institution name in form', async () => {
    render(<SchoolSettingsPage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('Escola Teste')).toBeInTheDocument()
    })
  })
})