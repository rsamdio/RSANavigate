/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dbe4fe',
          200: '#bfd0fe',
          300: '#93b1fd',
          400: '#608afa',
          500: '#3b66f6',
          600: '#2547eb',
          700: '#1d35d8',
          800: '#1e2cb0',
          900: '#1e298a',
          950: '#171a54'
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        }
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1', boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.7)' },
          '50%': { transform: 'scale(1.08)', opacity: '0.9', boxShadow: '0 0 0 14px rgba(59, 130, 246, 0)' }
        },
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.4)', opacity: '0' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite cubic-bezier(0.4, 0, 0.6, 1)',
        'ripple': 'ripple 1.8s cubic-bezier(0, 0.2, 0.8, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out forwards'
      }
    },
  },
  plugins: [],
}
