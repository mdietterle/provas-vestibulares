import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import RedacaoListPage from './RedacaoListPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Prof', role: 'professor' }, logout: vi.fn() }),
}))
vi.mock('../api/redacoes', () => ({
  redacoesApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

const { redacoesApi } = await import('../api/redacoes')

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('RedacaoListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(redacoesApi.list).mockResolvedValue({ data: [] })
  })

  it('renders redações heading', async () => {
    renderWithProviders(<RedacaoListPage />)
    expect(screen.getByRole('heading', { name: /redações/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(redacoesApi.list).toHaveBeenCalled()
    })
  })

  it('shows filter buttons', () => {
    renderWithProviders(<RedacaoListPage />)
    expect(screen.getByText(/todas/i)).toBeInTheDocument()
    expect(screen.getByText(/aguardando revisão/i)).toBeInTheDocument()
  })

  it('loads redações on mount', async () => {
    renderWithProviders(<RedacaoListPage />)
    await waitFor(() => {
      expect(redacoesApi.list).toHaveBeenCalledTimes(1)
    })
  })
})