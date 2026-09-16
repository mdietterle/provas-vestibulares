/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cognition: {
          primary: '#2563EB',
          'primary-container': '#1e3a8a',
          'on-primary': '#ffffff',
          'on-primary-container': '#90a8ff',
          secondary: '#6366F1',
          'secondary-container': '#8455ef',
          tertiary: '#10B981',
          bg: '#F4F6F9',
          surface: '#ffffff',
          'surface-low': '#EFF6FF',
          'surface-mid': '#E2E8F0',
          'surface-high': '#dce9ff',
          'surface-dim': '#cbdbf5',
          'on-surface': '#1E293B',
          'on-surface-variant': '#334155',
          outline: '#64748B',
          'outline-variant': '#c5c5d3',
          'sidebar-text': '#b6c4ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0px 4px 20px rgba(0, 35, 111, 0.08)',
        'card-hover': '0px 8px 30px rgba(0, 35, 111, 0.14)',
        glow: '0 0 0 1px rgba(107,56,212,0.15), 0 8px 30px rgba(107,56,212,0.25)',
        'soft-xl': '0 20px 60px -15px rgba(0, 35, 111, 0.25)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #2563EB 0%, #6366F1 100%)',
        'brand-gradient-radial': 'radial-gradient(circle at 30% 20%, #1a3cad 0%, #2563EB 55%, #1E293B 100%)',
        'brand-mesh': `radial-gradient(circle at 15% 15%, rgba(107,56,212,0.16) 0%, transparent 45%),
          radial-gradient(circle at 85% 10%, rgba(0,35,111,0.12) 0%, transparent 40%),
          radial-gradient(circle at 50% 100%, rgba(107,56,212,0.10) 0%, transparent 50%)`,
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
