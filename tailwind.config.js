/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#1E3070',
        },
        brand: {
          bg: '#FFFFFF',
          card: '#FFFFFF',
          hero: '#F9FAFB',
          text: '#0A0A0A',
          muted: '#64748B',
          border: '#E5E7EB',
          dark: {
            bg: '#0A0A0F',
            card: '#111118',
            hero: '#0F0F18',
            text: '#F8FAFC',
            muted: '#94A3B8',
            border: '#1E1E2E',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.10)',
        'glow': '0 0 40px rgba(37,99,235,0.12)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #F9FAFB 0%, #FFFFFF 100%)',
        'hero-dark': 'linear-gradient(135deg, #0A0A0F 0%, #0F0F18 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
