import axios from 'axios'

// Em produção a API é servida no mesmo domínio do site (rewrite /api → Render no
// vercel.json), então o padrão é o caminho relativo /api. Em dev, o proxy /api do
// Vite faz o mesmo papel. VITE_API_URL só deve ser usado para apontar a outro
// backend same-site: o cookie de sessão é SameSite=Lax e não segue chamadas
// cross-site (ex.: vercel.app → onrender.com).
const API_ORIGIN = (import.meta.env.VITE_API_URL as string | undefined) || ''

export const API_BASE = API_ORIGIN ? `${API_ORIGIN.replace(/\/$/, '')}/api` : '/api'

// Header exigido pelo backend em POST/PUT/PATCH/DELETE autenticados por cookie
// (proteção CSRF: formulários cross-site não conseguem enviá-lo).
export const CSRF_HEADERS = { 'X-Requested-With': 'XMLHttpRequest' } as const

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { ...CSRF_HEADERS },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url || ''
    // /auth/me é a sondagem de sessão no carregamento: 401 ali só significa "não logado".
    const isAuthProbe =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/me') ||
      url.includes('/auth/logout')
    if (err.response?.status === 401 && !isAuthProbe) {
      window.location.href = '/login?expired=1'
    }
    return Promise.reject(err)
  },
)

export default api
