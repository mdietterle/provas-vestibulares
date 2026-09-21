import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'

/** Botão de alternar tema (claro/escuro/sistema) — compartilhado entre o
 * Layout (área logada) e o PublicHeader (site público), pra não ficarem
 * duas implementações divergentes do mesmo controle. */
export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8490b0] hover:bg-[#f0f4ff] hover:text-[#4f46e5] dark:hover:bg-[#192745] dark:hover:text-[#93c5fd] transition-colors"
        title={`Tema atual: ${theme === 'system' ? 'Sistema' : theme === 'dark' ? 'Escuro' : 'Claro'}`}
        aria-label="Alternar tema"
      >
        {resolvedTheme === 'dark' ? (
          <svg className="w-[18px] h-[18px] text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-[#131f37] rounded-xl border border-[#e8eeff] dark:border-[#1e2d4a] py-1.5 z-50 shadow-xl"
          style={{ boxShadow: '0 8px 30px rgba(0,35,111,0.15)' }}>
          <button
            onClick={() => { setTheme('light'); setOpen(false) }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              theme === 'light'
                ? 'text-[#4f46e5] dark:text-[#93c5fd] font-semibold bg-[#f0f4ff] dark:bg-[#1e2d4a]'
                : 'text-[#374060] dark:text-[#94a3b8] hover:bg-[#f4f6fb] dark:hover:bg-[#182643]'
            }`}
          >
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Claro
          </button>
          <button
            onClick={() => { setTheme('dark'); setOpen(false) }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              theme === 'dark'
                ? 'text-[#4f46e5] dark:text-[#93c5fd] font-semibold bg-[#f0f4ff] dark:bg-[#1e2d4a]'
                : 'text-[#374060] dark:text-[#94a3b8] hover:bg-[#f4f6fb] dark:hover:bg-[#182643]'
            }`}
          >
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            Escuro
          </button>
          <button
            onClick={() => { setTheme('system'); setOpen(false) }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              theme === 'system'
                ? 'text-[#4f46e5] dark:text-[#93c5fd] font-semibold bg-[#f0f4ff] dark:bg-[#1e2d4a]'
                : 'text-[#374060] dark:text-[#94a3b8] hover:bg-[#f4f6fb] dark:hover:bg-[#182643]'
            }`}
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Sistema
          </button>
        </div>
      )}
    </div>
  )
}
