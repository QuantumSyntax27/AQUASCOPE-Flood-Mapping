/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F2F6FB',
          100: '#E2EAF4',
          200: '#C4D4E8',
          300: '#9AB8D8',
          400: '#6A93C0',
          500: '#3E6FA3',
          600: '#2C5685',
          700: '#1E3F66',
          800: '#142A47',
          900: '#0B1F3A',
          950: '#071426',
        },
        brand: {
          50: '#EEF7FE',
          100: '#D9ECFD',
          200: '#B7D9FB',
          300: '#84BDF7',
          400: '#4E9BF0',
          500: '#1E7FE0',
          600: '#0E63C2',
          700: '#0B4E9C',
          800: '#0A3F7A',
          900: '#09335F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(11, 31, 58, 0.06), 0 1px 3px rgba(11, 31, 58, 0.08)',
        lifted: '0 4px 12px rgba(11, 31, 58, 0.12), 0 2px 4px rgba(11, 31, 58, 0.08)',
        map: '0 8px 28px rgba(11, 31, 58, 0.22)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.9' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        'sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(240%)' },
        },
        'dash-flow': {
          to: { strokeDashoffset: '-24' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.2, 0.6, 0.4, 1) infinite',
        'sweep': 'sweep 4.5s linear infinite',
        'dash-flow': 'dash-flow 1.2s linear infinite',
      },
    },
  },
  plugins: [],
};
