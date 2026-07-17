/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        purple: {
          350: '#c084fc',
          450: '#a855f7',
          550: '#9333ea',
          650: '#7c3aed',
        },
        indigo: {
          650: '#4338ca',
        },
        slate: {
          350: '#94a3b8',
        }
      },
      animation: {
        'fade-in':        'fadeIn 0.3s ease-in-out',
        'slide-up':       'slideUp 0.3s ease-out',
        'gentle-float':   'gentleFloat 3.5s ease-in-out infinite',
        'light-shake':    'lightShake 2.8s ease-in-out infinite',
        'letter-reveal':  'letterReveal 0.5s cubic-bezier(0.22,1,0.36,1) forwards',
        'hud-scan':       'hudScan 2.5s linear infinite',
        'pulse-soft':     'pulseSoft 2s ease-in-out infinite',
        'bar-fill':       'barFill 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: 0 },
          '100%': { opacity: 1 }
        },
        slideUp: {
          '0%':   { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)',    opacity: 1 }
        },
        gentleFloat: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' }
        },
        lightShake: {
          '0%, 100%': { transform: 'translateX(0px) rotate(0deg)' },
          '20%':      { transform: 'translateX(-2px) rotate(-0.4deg)' },
          '40%':      { transform: 'translateX(2px) rotate(0.4deg)' },
          '60%':      { transform: 'translateX(-1px) rotate(-0.2deg)' },
          '80%':      { transform: 'translateX(1px) rotate(0.2deg)' }
        },
        letterReveal: {
          '0%':   { opacity: 0, transform: 'translateY(-18px) scale(0.85)' },
          '100%': { opacity: 1, transform: 'translateY(0px) scale(1)' }
        },
        hudScan: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: 0.6 },
          '50%':      { opacity: 1 }
        },
        barFill: {
          '0%':   { width: '0%' },
          '100%': { width: '100%' }
        }
      },
      transitionDuration: {
        '550': '550ms',
        '750': '750ms',
        '900': '900ms',
      },
      scale: {
        '95':  '0.95',
        '108': '1.08',
      }
    }
  },
  plugins: []
}
