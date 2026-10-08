import type { ReactNode } from 'react'

type EmptyStateVariant = 'professors' | 'students' | 'subjects' | 'classes' | 'questions' | 'exams' | 'corrections' | 'notifications' | 'search'

const illustrations: Record<EmptyStateVariant, ReactNode> = {
  professors: (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="88" rx="44" ry="8" fill="#f0fdfa" />
      <rect x="28" y="38" width="64" height="46" rx="10" fill="#f0fdfa" />
      <rect x="36" y="46" width="48" height="6" rx="3" fill="#99f6e4" />
      <rect x="36" y="58" width="32" height="5" rx="2.5" fill="#ccfbf1" />
      <rect x="36" y="68" width="20" height="5" rx="2.5" fill="#ccfbf1" />
      <circle cx="60" cy="22" r="14" fill="#99f6e4" />
      <circle cx="60" cy="18" r="7" fill="#f0fdfa" />
      <path d="M46 36c0-7.732 6.268-14 14-14s14 6.268 14 14" fill="#99f6e4" />
    </svg>
  ),
  students: (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="88" rx="44" ry="8" fill="#eef2ff" />
      <circle cx="40" cy="30" r="10" fill="#c5ceff" />
      <circle cx="60" cy="26" r="12" fill="#b6c4ff" />
      <circle cx="80" cy="30" r="10" fill="#c5ceff" />
      <path d="M20 68c0-11.046 8.954-20 20-20s20 8.954 20 20v12H20V68z" fill="#f0fdfa" />
      <path d="M60 64c0-8.837 7.163-16 16-16s16 7.163 16 16v16H60V64z" fill="#f0fdfa" />
      <path d="M30 60c0-5.523 4.477-10 10-10s10 4.477 10 10v20H30V60z" fill="#b6c4ff" />
    </svg>
  ),
  subjects: (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="88" rx="44" ry="8" fill="#eef2ff" />
      <rect x="22" y="28" width="36" height="48" rx="6" fill="#c5ceff" />
      <rect x="30" y="36" width="20" height="4" rx="2" fill="#eef2ff" />
      <rect x="30" y="44" width="16" height="3" rx="1.5" fill="#eef2ff" />
      <rect x="30" y="51" width="18" height="3" rx="1.5" fill="#eef2ff" />
      <rect x="62" y="20" width="36" height="48" rx="6" fill="#b6c4ff" />
      <rect x="70" y="28" width="20" height="4" rx="2" fill="#eef2ff" />
      <rect x="70" y="36" width="16" height="3" rx="1.5" fill="#eef2ff" />
      <rect x="70" y="43" width="18" height="3" rx="1.5" fill="#eef2ff" />
    </svg>
  ),
  classes: (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="88" rx="44" ry="8" fill="#eef2ff" />
      <rect x="18" y="36" width="84" height="48" rx="8" fill="#f0fdfa" />
      <rect x="18" y="36" width="84" height="16" rx="8" fill="#b6c4ff" />
      <rect x="18" y="44" width="84" height="8" fill="#b6c4ff" />
      <rect x="32" y="60" width="56" height="4" rx="2" fill="#c5ceff" />
      <rect x="32" y="70" width="42" height="4" rx="2" fill="#c5ceff" />
      <rect x="44" y="20" width="16" height="22" rx="4" fill="#c5ceff" />
      <rect x="60" y="20" width="16" height="22" rx="4" fill="#b6c4ff" />
    </svg>
  ),
  questions: (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="88" rx="44" ry="8" fill="#eef2ff" />
      <rect x="24" y="22" width="72" height="60" rx="10" fill="#f0fdfa" />
      <circle cx="60" cy="42" r="12" fill="#b6c4ff" />
      <path d="M55 40c0-2.761 2.239-5 5-5s5 2.239 5 5c0 1.858-1.015 3.479-2.526 4.337C61.585 44.766 61 45.359 61 46v1" stroke="#eef2ff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="61" cy="50" r="1.5" fill="#eef2ff" />
      <rect x="36" y="62" width="48" height="4" rx="2" fill="#c5ceff" />
      <rect x="42" y="70" width="36" height="4" rx="2" fill="#c5ceff" />
    </svg>
  ),
  exams: (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="88" rx="44" ry="8" fill="#eef2ff" />
      <rect x="28" y="16" width="64" height="72" rx="8" fill="#f0fdfa" />
      <rect x="28" y="16" width="64" height="18" rx="8" fill="#b6c4ff" />
      <rect x="28" y="26" width="64" height="8" fill="#b6c4ff" />
      <rect x="40" y="42" width="40" height="4" rx="2" fill="#c5ceff" />
      <rect x="40" y="52" width="30" height="4" rx="2" fill="#c5ceff" />
      <rect x="40" y="62" width="36" height="4" rx="2" fill="#c5ceff" />
      <circle cx="36" cy="44" r="3" fill="#b6c4ff" />
      <circle cx="36" cy="54" r="3" fill="#b6c4ff" />
      <circle cx="36" cy="64" r="3" fill="#b6c4ff" />
    </svg>
  ),
  corrections: (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="88" rx="44" ry="8" fill="#eef2ff" />
      <rect x="24" y="24" width="72" height="60" rx="8" fill="#f0fdfa" />
      <rect x="36" y="36" width="48" height="5" rx="2.5" fill="#b6c4ff" />
      <rect x="36" y="47" width="36" height="5" rx="2.5" fill="#c5ceff" />
      <rect x="36" y="58" width="42" height="5" rx="2.5" fill="#c5ceff" />
      <circle cx="84" cy="30" r="14" fill="#d1fae5" />
      <path d="M77 30l4 4 6-8" stroke="#27c38a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  notifications: (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="88" rx="44" ry="8" fill="#eef2ff" />
      <path d="M60 18c-14.912 0-26 11.088-26 24v14l-6 8h64l-6-8V42c0-12.912-11.088-24-26-24z" fill="#f0fdfa" />
      <path d="M34 64h52l-6-8V42c0-12.912-11.088-24-26-24" stroke="#b6c4ff" strokeWidth="2" />
      <rect x="48" y="68" width="24" height="8" rx="4" fill="#b6c4ff" />
      <circle cx="60" cy="18" r="4" fill="#c5ceff" />
    </svg>
  ),
  search: (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="88" rx="44" ry="8" fill="#eef2ff" />
      <circle cx="52" cy="44" r="22" fill="#f0fdfa" />
      <circle cx="52" cy="44" r="14" fill="#b6c4ff" />
      <path d="M69 61l14 14" stroke="#c5ceff" strokeWidth="6" strokeLinecap="round" />
      <path d="M47 40l3 3 5-6" stroke="#eef2ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

interface EmptyStateProps {
  variant: EmptyStateVariant
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ variant, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="mb-4">
        {illustrations[variant]}
      </div>
      <h3 className="text-base font-semibold text-[#1E293B] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#64748B] max-w-xs mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
