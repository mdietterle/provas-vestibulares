// Tokens extraídos do design "Início - EduPrep AI (Performance)" no Stitch (projeto "Mobile APP").
export const colors = {
  academicNavy: '#0B2149',
  primary: '#000B26',
  primaryContainer: '#0B2149',
  primaryFixed: '#D9E2FF',
  primaryFixedDim: '#B3C6F7',
  onPrimaryContainer: '#7789B7',

  secondary: '#843AB4',
  secondaryContainer: '#CC80FD',
  onSecondaryContainer: '#580087',
  secondaryFixed: '#F4D9FF',

  success: '#58CC02',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  diagnosticYellow: '#FFC800',
  iaAccent: '#1CB0F6',
  progressPurple: '#CE82FF',

  surface: '#F7F9FB',
  surfaceBright: '#F7F9FB',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F2F4F6',
  surfaceContainer: '#ECEEF0',
  surfaceContainerHigh: '#E6E8EA',
  surfaceContainerHighest: '#E0E3E5',
  surfaceVariant: '#E0E3E5',

  onSurface: '#191C1E',
  onSurfaceVariant: '#44464E',
  outline: '#75777F',
  outlineVariant: '#C5C6D0',
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

export const spacing = {
  base: 8,
  gutter: 16,
  containerMargin: 24,
  sectionGap: 48,
} as const;

// Hanken Grotesk = títulos e corpo de texto; JetBrains Mono = labels/valores técnicos (do design original).
export const fonts = {
  headlineLgMobile: 'HankenGrotesk_700Bold',
  headlineLg: 'HankenGrotesk_700Bold',
  titleMd: 'HankenGrotesk_600SemiBold',
  titleMdExtra: 'HankenGrotesk_800ExtraBold',
  bodyMd: 'HankenGrotesk_400Regular',
  bodyBold: 'HankenGrotesk_700Bold',
  labelSm: 'JetBrainsMono_500Medium',
  labelMd: 'JetBrainsMono_500Medium',
} as const;

export const fontSizes = {
  headlineLgMobile: 28,
  headlineLg: 32,
  titleMd: 20,
  bodyMd: 16,
  bodyLg: 18,
  labelSm: 12,
  labelMd: 14,
} as const;
