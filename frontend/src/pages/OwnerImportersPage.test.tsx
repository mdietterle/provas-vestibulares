import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '../contexts/ThemeContext'
import OwnerImportersPage from './OwnerImportersPage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Admin', role: 'admin' }, logout: vi.fn() }),
}))
vi.mock('./OwnerPage', () => ({
  MiniBar: () => <div data-testid="mini-bar">MiniBar</div>,
}))
vi.mock('../api', () => ({
  enemApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  acafeApi: { runSeed: vi.fn().mockResolvedValue({}) },
  ufprApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  ufscApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  itaApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  uerjApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  ufgdApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  uemApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  ufmsApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  fuvestApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  pucrioApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  udescApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  unespApi: { runSeed: vi.fn().mockResolvedValue({}) },
  cebraspeApi: { runSeed: vi.fn().mockResolvedValue({}) },
  unifespApi: { runSeed: vi.fn().mockResolvedValue({}) },
  espmApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  fgvApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  pucprApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  pucrsApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  ufpelApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  ufrgsApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  unicampApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  ufgApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  ufjfApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  ufuApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  ufpaApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  utfprApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  unioesteApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  uelApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  pucminasApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  ufrnApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  ufsmApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  ulbraApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  ufamApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  puccampinasApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  unimontesApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  unicentroApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  unaerpApi: { runImportAll: vi.fn().mockResolvedValue({}) },
  ownerApi: { listExamVersions: vi.fn().mockResolvedValue({ data: [] }) },
}))
vi.mock('../api/uploadPdf', () => ({
  uploadPdfApi: { upload: vi.fn().mockResolvedValue({ data: {} }) },
}))

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('OwnerImportersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders import panel heading', async () => {
    renderWithProviders(<OwnerImportersPage />)
    await waitFor(() => {
      expect(screen.getByText(/ENEM/i)).toBeInTheDocument()
    })
  })

  it('shows source selector with universities', () => {
    renderWithProviders(<OwnerImportersPage />)
    expect(screen.getByText(/ACAFE/i)).toBeInTheDocument()
    expect(screen.getByText(/UFPR/i)).toBeInTheDocument()
  })

  it('renders mini bar component', () => {
    renderWithProviders(<OwnerImportersPage />)
    expect(screen.getByTestId('mini-bar')).toBeInTheDocument()
  })
})