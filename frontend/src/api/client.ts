import axios from 'axios'

// Em produção (build) usa o backend do Render; em dev usa o proxy /api do Vite.
const API_ORIGIN = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://provas-khsq.onrender.com' : '')

const baseURL = API_ORIGIN ? `${API_ORIGIN}/api` : '/api'

const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url || ''
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register')
    if (err.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default api
