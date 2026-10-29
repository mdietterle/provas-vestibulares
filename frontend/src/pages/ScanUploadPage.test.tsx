import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import ScanUploadPage from './ScanUploadPage'

vi.mock('../api/submissions', () => ({
  submissionsApi: {
    uploadScan: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

const { submissionsApi } = await import('../api/submissions')

const renderWithProviders = (ui: React.ReactElement, initialEntry = '/exams/1/scan') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ThemeProvider>
          <Routes>
            <Route path="/exams/:id/scan" element={ui} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('ScanUploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders upload heading', async () => {
    renderWithProviders(<ScanUploadPage />)
    expect(screen.getByRole('heading', { name: /enviar prova digitalizada/i })).toBeInTheDocument()
  })

  it('shows drop zone text', () => {
    renderWithProviders(<ScanUploadPage />)
    expect(screen.getByText(/clique ou arraste a imagem aqui/i)).toBeInTheDocument()
  })

  it('has back button', () => {
    renderWithProviders(<ScanUploadPage />)
    expect(screen.getByText(/← voltar/i)).toBeInTheDocument()
  })
})