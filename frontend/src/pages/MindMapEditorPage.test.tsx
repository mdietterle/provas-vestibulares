import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import MindMapEditorPage from './MindMapEditorPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Aluno', role: 'student' }, logout: vi.fn() }),
}))
vi.mock('../api/mindmaps', () => ({
  mindmapsApi: {
    get: vi.fn().mockResolvedValue({ data: { id: 1, title: 'Mapa Teste', nodes: [], connections: [] } }),
    save: vi.fn().mockResolvedValue({ data: { id: 1 } }),
  },
}))

const { mindmapsApi } = await import('../api/mindmaps')

const renderWithProviders = (ui: React.ReactElement, initialEntry = '/mindmaps/novo') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ThemeProvider>
          <Routes>
            <Route path="/mindmaps/:id?" element={ui} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('MindMapEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders editor heading in create mode', async () => {
    renderWithProviders(<MindMapEditorPage />, '/mindmaps/novo')
    expect(screen.getByText(/novo mapa mental/i)).toBeInTheDocument()
  })

  it('loads map data when editing existing map', async () => {
    renderWithProviders(<MindMapEditorPage />, '/mindmaps/1')
    await waitFor(() => {
      expect(mindmapsApi.get).toHaveBeenCalledWith('1')
    })
  })

  it('shows canvas area', () => {
    renderWithProviders(<MindMapEditorPage />, '/mindmaps/novo')
    const canvas = document.querySelector('svg') || document.querySelector('[class*="canvas"]') || document.querySelector('[class*="overflow"]')
    expect(canvas).toBeTruthy()
  })
})