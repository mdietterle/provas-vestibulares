export type Tone = 'red' | 'amber' | 'green' | 'blue' | 'gray' | 'navy' | 'purple' | 'orange'

export const TONE_BADGE: Record<Tone, string> = {
  red:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  amber:  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  green:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  gray:   'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
  navy:   'bg-[#dce1ff] text-[#4f46e5] dark:bg-[#272a32] dark:text-[#818CF8]',
  purple: 'bg-[#e9ddff] text-[#712ae2] dark:bg-[#271a48] dark:text-[#b794f6]',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

export const TONE_TEXT: Record<Tone, string> = {
  red:    'text-red-600 dark:text-red-400',
  amber:  'text-amber-600 dark:text-amber-400',
  green:  'text-green-600 dark:text-green-500',
  blue:   'text-blue-600 dark:text-blue-400',
  gray:   'text-gray-500 dark:text-gray-400',
  navy:   'text-[#4f46e5] dark:text-[#818CF8]',
  purple: 'text-[#712ae2] dark:text-[#b794f6]',
  orange: 'text-orange-600 dark:text-orange-400',
}

export const TONE_DOT: Record<Tone, string> = {
  red:    'bg-red-500',
  amber:  'bg-amber-500',
  green:  'bg-green-500',
  blue:   'bg-blue-500',
  gray:   'bg-gray-400',
  navy:   'bg-[#4f46e5] dark:bg-[#818CF8]',
  purple: 'bg-[#712ae2]',
  orange: 'bg-orange-500',
}

export const TONE_PANEL: Record<'red' | 'amber', string> = {
  red:   'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/40',
  amber: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40',
}

export const TONE_BG: Record<Tone, string> = {
  red:    'bg-red-50 dark:bg-red-950/20',
  amber:  'bg-amber-50 dark:bg-amber-950/20',
  green:  'bg-green-50 dark:bg-green-950/20',
  blue:   'bg-blue-50 dark:bg-blue-950/20',
  gray:   'bg-gray-50 dark:bg-slate-800/60',
  navy:   'bg-[#dce1ff] dark:bg-[#272a32]',
  purple: 'bg-[#e9ddff] dark:bg-[#271a48]',
  orange: 'bg-orange-50 dark:bg-orange-950/20',
}