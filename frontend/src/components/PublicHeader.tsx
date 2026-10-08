import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'

const LOGO = (
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}>
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    </div>
    <span className="font-display font-bold text-slate-600 dark:text-slate-400 text-lg tracking-tight">Cognition AI</span>
  </div>
)

const NAV_LINKS = [
  { to: '/universidades', label: 'Universidades' },
  { to: '/calendario', label: 'Calendário' },
  { to: '/ajuda', label: 'Ajuda' },
  { to: '/plans', label: 'Preços' },
]

/** Header compartilhado por todas as páginas públicas — mesmo conjunto de links,
 * mesma ordem, em toda parte. Antes cada página pública reimplementava seu
 * próprio nav com um subconjunto diferente de links. */
export default function PublicHeader() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <nav className="bg-white/90 dark:bg-[#10131a]/90 backdrop-blur-md sticky top-0 z-50 border-b border-[#eef1fb] dark:border-[#2a2d3a]">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/">{LOGO}</Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-5 text-sm">
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to} className="font-medium text-[#334155] dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
              {l.label}
            </Link>
          ))}
          {user ? (
            <Link
              to="/"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 shadow-[0_2px_10px_rgba(0,35,111,0.25)]"
              style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}
            >
              Ir para o painel
            </Link>
          ) : (
            <>
              <Link to="/aluno" className="font-medium text-[#334155] dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
                Sou aluno
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 shadow-[0_2px_10px_rgba(0,35,111,0.25)]"
                style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}
              >
                Entrar
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>

        {/* Mobile: tema sempre visível + hamburger pro resto do menu */}
        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-[#eef1fb] dark:border-[#464554] bg-white dark:bg-[#1d1f27] px-6 py-4 flex flex-col gap-3 text-sm">
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="font-medium text-[#334155] dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-400">
              {l.label}
            </Link>
          ))}
          {user ? (
            <Link to="/" onClick={() => setOpen(false)} className="font-semibold text-slate-600 dark:text-slate-400">
              Ir para o painel
            </Link>
          ) : (
            <>
              <Link to="/aluno" onClick={() => setOpen(false)} className="font-medium text-[#334155] dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-400">
                Sou aluno
              </Link>
              <Link to="/login" onClick={() => setOpen(false)} className="font-semibold text-slate-600 dark:text-slate-400">
                Entrar
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
