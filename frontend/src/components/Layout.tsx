import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { notificationsApi, questionBanksApi, type Notification } from '../api'
import ThemeToggle from './ThemeToggle'

// ── Nav structure ─────────────────────────────────────────────────────────────

type NavLeaf = {
  kind: 'item'
  to: string
  label: string
  roles: string[]
  requireCar?: boolean
  /** Se definido, o item só aparece se este banco de questões tiver questões importadas. */
  bankSlug?: string
  icon: React.ReactNode
}

type NavGroup = {
  kind: 'group'
  label: string
  roles: string[]
  requireCar?: boolean
  icon: React.ReactNode
  children: NavLeaf[]
}

type NavEntry = NavLeaf | NavGroup

const nav: NavEntry[] = [
  {
    kind: 'item',
    to: '/',
    label: 'Dashboard',
    roles: ['admin', 'professor', 'student'],
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },

  // ── Student ──
  {
    kind: 'item',
    to: '/exams',
    label: 'Provas',
    roles: ['student'],
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    kind: 'item',
    to: '/simulados',
    label: 'Simulados',
    roles: ['student'],
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    kind: 'item',
    to: '/redacoes',
    label: 'Redações',
    roles: ['student'],
    requireCar: true,
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },

  // ── Admin / Professor: Pessoas ──
  {
    kind: 'group',
    label: 'Pessoas',
    roles: ['admin', 'professor'],
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    children: [
      {
        kind: 'item', to: '/professors', label: 'Professores', roles: ['admin'],
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      },
      {
        kind: 'item', to: '/students', label: 'Alunos', roles: ['admin'],
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
        ),
      },
      {
        kind: 'item', to: '/classes', label: 'Turmas', roles: ['admin', 'professor'],
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      },
      {
        kind: 'item', to: '/subjects', label: 'Matérias', roles: ['admin', 'professor'],
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
      },
      {
        kind: 'item', to: '/user-access', label: 'Controle de Acesso', roles: ['admin'],
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        ),
      },
    ],
  },

  // ── Admin / Professor: Avaliações ──
  {
    kind: 'group',
    label: 'Avaliações',
    roles: ['admin', 'professor'],
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    children: [
      {
        kind: 'item', to: '/exams', label: 'Provas', roles: ['admin', 'professor'],
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        kind: 'item', to: '/corrections', label: 'Correções', roles: ['admin', 'professor'],
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
      },
    ],
  },

  // ── Admin / Professor: Banco de Questões ──
  {
    kind: 'group',
    label: 'Banco de Questões',
    roles: ['admin', 'professor'],
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3V7M4 7c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3M4 7c0-2 1.5-3 4-3h8c2.5 0 4 1 4 3" />
      </svg>
    ),
    children: [
      {
        kind: 'item', to: '/questions', label: 'Minhas Questões', roles: ['admin', 'professor'],
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        kind: 'item', to: '/enem-bank', label: 'ENEM', roles: ['admin', 'professor'], bankSlug: 'enem',
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3V7M4 7c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3M4 7c0-2 1.5-3 4-3h8c2.5 0 4 1 4 3" />
          </svg>
        ),
      },
      {
        kind: 'item', to: '/acafe-bank', label: 'ACAFE', roles: ['admin', 'professor'], bankSlug: 'acafe',
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3V7M4 7c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3M4 7c0-2 1.5-3 4-3h8c2.5 0 4 1 4 3" />
          </svg>
        ),
      },
      {
        kind: 'item', to: '/ufpr-bank', label: 'UFPR', roles: ['admin', 'professor'], bankSlug: 'ufpr',
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3V7M4 7c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3M4 7c0-2 1.5-3 4-3h8c2.5 0 4 1 4 3" />
          </svg>
        ),
      },
      {
        kind: 'item', to: '/ufrgs-bank', label: 'UFRGS', roles: ['admin', 'professor'], bankSlug: 'ufrgs',
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3V7M4 7c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3M4 7c0-2 1.5-3 4-3h8c2.5 0 4 1 4 3" />
          </svg>
        ),
      },
      {
        kind: 'item', to: '/pucpr-bank', label: 'PUCPR', roles: ['admin', 'professor'], bankSlug: 'pucpr',
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3V7M4 7c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3M4 7c0-2 1.5-3 4-3h8c2.5 0 4 1 4 3" />
          </svg>
        ),
      },
      {
        kind: 'item', to: '/ita-bank', label: 'ITA', roles: ['admin', 'professor'], bankSlug: 'ita',
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3V7M4 7c0 2 1.5 3 4 3h8c2.5 0 4-1 4-3M4 7c0-2 1.5-3 4-3h8c2.5 0 4 1 4 3" />
          </svg>
        ),
      },
    ],
  },

  // ── Admin / Professor: Redações (CAR) ──
  {
    kind: 'item',
    to: '/redacoes/professor',
    label: 'Redações',
    roles: ['admin', 'professor'],
    requireCar: true,
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },

  // ── Admin: Escola ──
  {
    kind: 'group',
    label: 'Escola',
    roles: ['admin'],
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    children: [
      {
        kind: 'item', to: '/school', label: 'Configurações', roles: ['admin'],
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        kind: 'item', to: '/usage', label: 'Uso & Limites', roles: ['admin'],
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        kind: 'item', to: '/subscription', label: 'Assinatura', roles: ['admin'],
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-9-9h19.5A2.25 2.25 0 0121 9v7.5a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 16.5V9a2.25 2.25 0 012.25-2.25z" />
          </svg>
        ),
      },
    ],
  },

  // ── Owner ──
  {
    kind: 'item',
    to: '/billing',
    label: 'Faturamento',
    roles: ['owner'],
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    kind: 'item',
    to: '/owner/schools',
    label: 'Escolas',
    roles: ['owner'],
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8m0 0V3l9 4.5v13.5m-9-9L3 12m0 0v9m0-9l9-4.5M3 21h18" />
      </svg>
    ),
  },
  {
    kind: 'item',
    to: '/owner/users',
    label: 'Usuários',
    roles: ['owner'],
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8zm6 3a4 4 0 10-3-6.7M6 8a4 4 0 103 6.7" />
      </svg>
    ),
  },
  {
    kind: 'item',
    to: '/owner/question-reports',
    label: 'Questões Reportadas',
    roles: ['owner'],
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    kind: 'item',
    to: '/owner/stats',
    label: 'Estatísticas',
    roles: ['owner'],
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    kind: 'item',
    to: '/owner/importers',
    label: 'Importadores',
    roles: ['owner'],
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
  },
]

// Links pro site público, fora do app logado — sem eles o usuário só chegava
// a Universidades/Calendário/Ajuda digitando a URL direto.
const PUBLIC_BRIDGE_LINKS = [
  { to: '/universidades', label: 'Universidades' },
  { to: '/calendario', label: 'Calendário de vestibulares' },
  { to: '/ajuda', label: 'Central de ajuda' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  professor: 'Professor',
  student: 'Aluno',
}

function Avatar({ name, avatar, size = 'md' }: { name: string; avatar?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (name ?? '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
  const sz = size === 'sm' ? 'w-7 h-7 text-[11px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  if (avatar) {
    return <img src={avatar} alt={name} className={`${sz} rounded-full object-cover shrink-0 ring-2 ring-white`} />
  }
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center text-white font-bold select-none shrink-0 ring-2 ring-white shadow-sm`}
      style={{ background: 'linear-gradient(135deg, #2563EB 0%, #6366F1 100%)' }}
    >
      {initials}
    </div>
  )
}

const KIND_COLORS: Record<string, { className: string; label: string }> = {
  submission: { className: 'bg-[#dce1ff] dark:bg-[#1a2947] text-[#2563EB] dark:text-[#818CF8]', label: 'Enviada' },
  correcting: { className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400', label: 'Corrigindo' },
  correction: { className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', label: 'Corrigida' },
  release: { className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400', label: 'Liberada' },
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

// ── Sidebar Group ─────────────────────────────────────────────────────────────

function SidebarGroup({
  group,
  userRole,
  carEnabled,
  collapsed,
  availableBankSlugs,
}: {
  group: NavGroup
  userRole: string
  carEnabled: boolean
  collapsed: boolean
  availableBankSlugs: Set<string> | null
}) {
  const location = useLocation()

  const visibleChildren = group.children.filter(
    c => c.roles.includes(userRole) && (!c.requireCar || carEnabled) &&
      (!c.bankSlug || (availableBankSlugs?.has(c.bankSlug) ?? false))
  )
  if (visibleChildren.length === 0) return null

  const isChildActive = visibleChildren.some(c => {
    if (c.to === '/') return location.pathname === '/'
    return location.pathname.startsWith(c.to)
  })

  const [open, setOpen] = useState(isChildActive)

  useEffect(() => {
    if (isChildActive) setOpen(true)
  }, [isChildActive])

  if (collapsed) {
    return (
      <div className="relative group/tooltip">
        <button
          className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-150 ${
            isChildActive ? 'bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]' : 'text-[#7a94d0] hover:bg-white/[0.07] hover:text-white'
          }`}
          title={group.label}
        >
          {group.icon}
        </button>
        {/* Tooltip */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none
          opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150">
          <div className="bg-[#1E293B] text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg">
            {group.label}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
          isChildActive
            ? 'bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
            : 'text-[#7a94d0] hover:bg-white/[0.07] hover:text-white'
        }`}
      >
        {group.icon}
        <span className="flex-1 text-left text-[13px]">{group.label}</span>
        <svg
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-0.5 ml-[13px] pl-3 border-l border-white/10 space-y-0.5">
          {visibleChildren.map(child => (
            <NavLink
              key={child.to}
              to={child.to}
              end={child.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-white/[0.14] text-white'
                    : 'text-[#7a94d0] hover:bg-white/[0.07] hover:text-[#c8d8ff]'
                }`
              }
            >
              {child.icon}
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sidebar Content ───────────────────────────────────────────────────────────

function SidebarContent({ userRole, carAccessOk, collapsed, availableBankSlugs }: { userRole: string; carAccessOk: boolean; collapsed: boolean; availableBankSlugs: Set<string> | null }) {
  return (
    <>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {nav.map((entry, i) => {
          if (entry.kind === 'item') {
            if (!entry.roles.includes(userRole)) return null
            if (entry.requireCar && !carAccessOk) return null

            if (collapsed) {
              return (
                <div key={entry.to} className="relative group/tooltip">
                  <NavLink
                    to={entry.to}
                    end={entry.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center justify-center p-2.5 rounded-xl transition-all duration-150 ${
                        isActive ? 'bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]' : 'text-[#7a94d0] hover:bg-white/[0.07] hover:text-white'
                      }`
                    }
                    title={entry.label}
                  >
                    {entry.icon}
                  </NavLink>
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150">
                    <div className="bg-[#1E293B] text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg">
                      {entry.label}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <NavLink
                key={entry.to}
                to={entry.to}
                end={entry.to === '/'}
                className={({ isActive }) =>
                  `relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                      : 'text-[#7a94d0] hover:bg-white/[0.07] hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gradient-to-b from-[#7c4de8] to-[#4d7fff]" />
                    )}
                    {entry.icon}
                    {entry.label}
                  </>
                )}
              </NavLink>
            )
          }

          if (!entry.roles.some(r => r === userRole)) return null
          if (entry.requireCar && !carAccessOk) return null
          return (
            <SidebarGroup key={i} group={entry} userRole={userRole} carEnabled={carAccessOk} collapsed={collapsed} availableBankSlugs={availableBankSlugs} />
          )
        })}
      </nav>
      {/* Ponte pro site público — antes só era alcançável digitando a URL. */}
      {!collapsed ? (
        <div className="px-3 pb-2 pt-2 border-t border-white/[0.06] space-y-0.5">
          <p className="px-3 pb-1 text-[10px] font-semibold text-[#5a78c0] uppercase tracking-wider">Recursos</p>
          {PUBLIC_BRIDGE_LINKS.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[12px] font-medium text-[#7a94d0] hover:bg-white/[0.07] hover:text-white transition-colors duration-150"
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      ) : (
        <div className="px-2 pb-2 pt-2 border-t border-white/[0.06] space-y-0.5">
          {PUBLIC_BRIDGE_LINKS.map(l => (
            <div key={l.to} className="relative group/tooltip">
              <NavLink
                to={l.to}
                className="flex items-center justify-center p-2 rounded-xl text-[#7a94d0] hover:bg-white/[0.07] hover:text-white transition-colors duration-150"
                title={l.label}
              >
                <span className="w-[6px] h-[6px] rounded-full bg-current" />
              </NavLink>
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150">
                <div className="bg-[#1E293B] text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg">
                  {l.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!collapsed && (
        <div className="px-3 pb-4 pt-2">
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(255,255,255,0.05)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}
          >
            <p className="text-[10px] font-semibold text-[#5a78c0] uppercase tracking-wider">Versão</p>
            <p className="text-[11px] text-[#7a94d0] mt-0.5">v1.0</p>
          </div>
        </div>
      )}
    </>
  )
}

// ── Main Layout ───────────────────────────────────────────────────────────────

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [pinned, setPinned] = useState(false) // fixa o menu expandido no desktop
  const [isMobile, setIsMobile] = useState(false)
  const [availableBankSlugs, setAvailableBankSlugs] = useState<Set<string> | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // No desktop, o painel está expandido se fixado (pin) ou ao hover
  const desktopExpanded = pinned || sidebarHovered

  // Fecha sidebar mobile ao navegar
  const location = useLocation()
  useEffect(() => { setMobileSidebarOpen(false) }, [location.pathname])

  const handleLogout = () => { logout(); navigate('/login') }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!user) return
    const fetch = () =>
      notificationsApi.list().then(r => {
        setNotifications(r.data)
        setUnread(r.data.filter(n => !n.read).length)
      }).catch(() => {})
    fetch()
    const id = setInterval(fetch, 30000)
    return () => clearInterval(id)
  }, [user])

  const userRole = user?.role ?? ''
  const carEnabled = user?.car_enabled ?? false
  const carAccessOk = carEnabled && (userRole !== 'professor' || (user?.car_access ?? false))

  useEffect(() => {
    if (userRole !== 'admin' && userRole !== 'professor') return
    questionBanksApi.available()
      .then(r => setAvailableBankSlugs(new Set(r.data.filter(b => b.count > 0).map(b => b.slug))))
      .catch(() => setAvailableBankSlugs(new Set()))
  }, [userRole])

  return (
    <div className="h-screen flex flex-col bg-[#f4f6fb] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#e2e8f0] overflow-hidden transition-colors duration-200">
      {/* ── Top header ── */}
      <header
        className="bg-white/85 dark:bg-[#0e172e]/90 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-50 border-b border-[#eaeff8] dark:border-[#1e2d4a]"
        style={{ height: 52, boxShadow: '0 1px 12px rgba(0,35,111,0.05)' }}
      >
        {/* Left: toggle + logo */}
        <div className="flex items-center gap-3">
          {/* Hambúrguer — desktop fixa/solta o menu, mobile abre overlay */}
          <button
            onClick={() => isMobile ? setMobileSidebarOpen(o => !o) : setPinned(p => !p)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8490b0] hover:bg-[#f0f4ff] hover:text-[#2563EB] dark:hover:bg-[#182643] dark:hover:text-[#93c5fd] transition-colors"
            title={isMobile ? 'Menu' : pinned ? 'Soltar menu (auto-ocultar)' : 'Fixar menu aberto'}
            aria-label="Alternar menu"
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #6366F1 100%)' }}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-display font-bold text-[#2563EB] dark:text-[#93c5fd] text-sm tracking-tight hidden sm:block">
              Cognition AI
            </span>
          </div>
        </div>

        {/* Right: theme toggle + bell + profile */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notification bell */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => { setBellOpen(o => !o); setUnread(0) }}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-[#8490b0] hover:bg-[#f0f4ff] hover:text-[#2563EB] dark:hover:bg-[#182643] dark:hover:text-[#93c5fd] transition-colors"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#131f37] rounded-xl border border-[#e8eeff] dark:border-[#1e2d4a] z-50 overflow-hidden"
                style={{ boxShadow: '0 8px 30px rgba(0,35,111,0.12)' }}>
                <div className="px-4 py-3 border-b border-[#f0f3fa] dark:border-[#1e2d4a] flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1E293B] dark:text-[#f8fafc]">Notificações</p>
                  {notifications.length > 0 && (
                    <span className="text-xs text-[#8490b0]">{notifications.length} eventos</span>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-[#f4f6fb] dark:divide-[#1e2d4a]">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                      <svg className="w-9 h-9 text-[#c5d0ea] dark:text-[#3b4c74] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <p className="text-sm text-[#8490b0]">Tudo em dia</p>
                    </div>
                  ) : (
                    notifications.map(n => {
                      const c = KIND_COLORS[n.kind] ?? KIND_COLORS.submission
                      return (
                        <div key={n.id} className={`px-4 py-3 flex items-start gap-3 ${!n.read ? 'bg-[#fafbff] dark:bg-[#182643]' : ''}`}>
                          <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${c.className}`}>
                            {c.label}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#1E293B] dark:text-[#e2e8f0] leading-snug">{n.message}</p>
                            {n.score != null && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Nota: {n.score.toFixed(1)}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-[#9da5bc] dark:text-[#64748b] shrink-0">{timeAgo(n.at)}</span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-2 rounded-lg pl-1 pr-2.5 py-1 hover:bg-[#f0f4ff] dark:hover:bg-[#182643] transition-colors ml-1"
            >
              {user && <Avatar name={user.name} avatar={user.avatar} size="sm" />}
              <div className="text-left hidden sm:block">
                <p className="text-[13px] font-semibold text-[#1E293B] dark:text-[#f8fafc] leading-tight">{user?.name}</p>
                <p className="text-[11px] text-[#8490b0]">{user ? ROLE_LABEL[user.role] : ''}</p>
              </div>
              <svg className={`w-3.5 h-3.5 text-[#8490b0] transition-transform hidden sm:block ${menuOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#131f37] rounded-xl border border-[#e8eeff] dark:border-[#1e2d4a] py-1 z-50"
                style={{ boxShadow: '0 8px 30px rgba(0,35,111,0.12)' }}>
                <div className="px-3.5 py-3 border-b border-[#f0f3fa] dark:border-[#1e2d4a]">
                  <div className="flex items-center gap-2.5">
                    {user && <Avatar name={user.name} avatar={user.avatar} size="sm" />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1E293B] dark:text-[#f8fafc] truncate">{user?.name}</p>
                      <p className="text-xs text-[#8490b0] truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { navigate('/profile'); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[#374060] dark:text-[#cbd5e1] hover:bg-[#f4f6fb] dark:hover:bg-[#182643] transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#8490b0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Meu Perfil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                    </svg>
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">
        {isMobile ? (
          <>
            {/* Backdrop mobile */}
            {mobileSidebarOpen && (
              <div
                className="fixed inset-0 top-[52px] bg-black/40 z-30"
                onClick={() => setMobileSidebarOpen(false)}
              />
            )}
            {/* Sidebar mobile: overlay deslizante de 256px */}
            <aside
              className="flex flex-col fixed top-[52px] bottom-0 left-0 z-40 overflow-y-auto overflow-x-hidden"
              style={{
                width: 256,
                background: 'linear-gradient(180deg, #0a2f85 0%, #2563EB 55%, #1E293B 100%)',
                transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.25s ease',
              }}
            >
              <SidebarContent userRole={userRole} carAccessOk={carAccessOk} collapsed={false} availableBankSlugs={availableBankSlugs} />
            </aside>
          </>
        ) : (
          /* Desktop: rail fixo de 64px + painel expansível por cima ao hover/pin */
          <aside
            onMouseEnter={() => setSidebarHovered(true)}
            onMouseLeave={() => setSidebarHovered(false)}
            className="shrink-0 z-40"
            style={{ width: 64 }}
          >
            <div
              className="fixed top-[52px] bottom-0 left-0 flex flex-col overflow-y-auto overflow-x-hidden z-40"
              style={{
                width: desktopExpanded ? 240 : 64,
                background: 'linear-gradient(180deg, #0a2f85 0%, #2563EB 55%, #1E293B 100%)',
                transition: 'width 0.2s ease',
                boxShadow: desktopExpanded && !pinned ? '4px 0 32px rgba(0,0,0,0.22)' : 'none',
              }}
            >
              <SidebarContent userRole={userRole} carAccessOk={carAccessOk} collapsed={!desktopExpanded} availableBankSlugs={availableBankSlugs} />
            </div>
          </aside>
        )}

        {/* ── Page content ── */}
        <main className="flex-1 min-w-0 overflow-auto bg-[#f4f6fb] dark:bg-[#0F172A]">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
