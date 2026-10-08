/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cognition: {
          primary: '#475569',
          'primary-hover': '#334155',
          'primary-container': '#1e293b',
          'on-primary': '#ffffff',
          secondary: '#64748b',
          'secondary-hover': '#475569',
          'secondary-container': '#334155',
          tertiary: '#94a3b8',
          bg: '#F8FAFC',
          surface: '#ffffff',
          'surface-low': '#F1F5F9',
          'surface-mid': '#E2E8F0',
          'surface-high': '#CBD5E1',
          'surface-dim': '#94A3B8',
          'on-surface': '#0F172A',
          'on-surface-variant': '#334155',
          outline: '#64748B',
          'outline-variant': '#CBD5E1',
          'sidebar-bg': '#0F172A',
          'sidebar-text': '#94A3B8',
          'sidebar-active': '#475569',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0px 4px 20px rgba(15, 23, 42, 0.06)',
        'card-hover': '0px 8px 30px rgba(15, 23, 42, 0.10)',
        glow: '0 0 0 1px rgba(71,85,105,0.15), 0 8px 30px rgba(71,85,105,0.20)',
        'soft-xl': '0 20px 60px -15px rgba(15, 23, 42, 0.15)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
        'brand-gradient-radial': 'radial-gradient(circle at 30% 20%, #1e293b 0%, #475569 55%, #0F172A 100%)',
        'brand-mesh': `radial-gradient(circle at 15% 15%, rgba(71,85,105,0.08) 0%, transparent 45%),
          radial-gradient(circle at 85% 10%, rgba(100,116,139,0.06) 0%, transparent 40%),
          radial-gradient(circle at 50% 100%, rgba(71,85,105,0.04) 0%, transparent 50%)`,
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        float: 'float 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}