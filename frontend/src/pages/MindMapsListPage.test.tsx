import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import MindMapsListPage from './MindMapsListPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Aluno', role: 'student' }, logout: vi.fn() }),
}))
vi.mock('../api/mindmaps', () => ({
  mindmapsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

const { mindmapsApi } = await import('../api/mindmaps')

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('MindMapsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mindmapsApi.list).mockResolvedValue({ data: [] })
  })

  it('renders heading and new map button', async () => {
    renderWithProviders(<MindMapsListPage />)
    expect(screen.getByRole('heading', { name: /mapas mentais/i })).toBeInTheDocument()
    expect(screen.getByText(/\+ novo mapa/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(mindmapsApi.list).toHaveBeenCalled()
    })
  })

  it('shows empty state when no maps', async () => {
    renderWithProviders(<MindMapsListPage />)
    await waitFor(() => {
      expect(screen.getByText(/nenhum mapa mental ainda/i)).toBeInTheDocument()
    })
  })

  it('loads maps on mount', async () => {
    renderWithProviders(<MindMapsListPage />)
    await waitFor(() => {
      expect(mindmapsApi.list).toHaveBeenCalledTimes(1)
    })
  })
})