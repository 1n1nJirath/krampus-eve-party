/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        krampus: {
          void: '#070a12',
          navy: '#0f172a',
          coal: '#18181b',
          crimson: '#dc2626',
          burgundy: '#991b1b',
          blood: '#7f1d1d',
          emerald: '#15803d',
          pine: '#064e3b',
          gold: '#eab308',
          glow: '#facc15',
        }
      },
      fontFamily: {
        sans: ['"Prompt"', 'system-ui', 'sans-serif'],
        display: ['"Cinzel Decorative"', '"Prompt"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
        'flicker': 'flicker 2.5s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        flicker: {
          '0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': { opacity: '0.99' },
          '20%, 21.999%, 63%, 63.999%, 65%, 69.999%': { opacity: '0.55' },
        },
      }
    },
  },
  plugins: [],
}
