// Entry de SSR usado só no build (scripts/prerender.mjs): renderiza o HTML
// completo de cada rota pública para que crawlers vejam o conteúdo sem
// executar JavaScript. No navegador, main.tsx segue montando o app normalmente.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { Route, Routes } from 'react-router-dom'
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import LandingPage from './pages/LandingPage'
import { publicRoutes } from './publicRoutes'
import { UNIVERSITIES } from './data/universities'
import { STUDY_GUIDES } from './data/studyGuides'

// Providers leem localStorage ao montar; no Node ele não existe.
const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true })
}

export function getPublicPaths(): string[] {
  return [
    '/',
    '/plans',
    '/quote',
    '/contact',
    '/privacidade',
    '/termos',
    '/sobre',
    '/ajuda',
    '/universidades',
    '/calendario',
    ...UNIVERSITIES.map(u => `/universidades/${u.slug}`),
    ...Object.keys(STUDY_GUIDES).map(slug => `/universidades/${slug}/como-estudar`),
  ]
}

export function render(url: string): { html: string; head: string } {
  const helmetContext: { helmet?: HelmetServerState } = {}
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <ThemeProvider>
        <StaticRouter location={url}>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              {publicRoutes()}
            </Routes>
          </AuthProvider>
        </StaticRouter>
      </ThemeProvider>
    </HelmetProvider>,
  )
  const h = helmetContext.helmet
  const head = h
    ? [h.title, h.meta, h.link, h.script].map(part => part.toString()).join('\n    ')
    : ''
  return { html, head }
}
