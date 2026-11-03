import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--cg-white-rgb) / <alpha-value>)',
        primary: {
          DEFAULT: '#2784D8',
          dark: '#1c6bb5',
          light: '#4ba0ec',
          glow: 'rgba(39, 132, 216, 0.35)',
        },
        lime: {
          DEFAULT: '#2784D8',
          dark: '#1c6bb5',
          light: '#5faef7',
          glow: 'rgba(39, 132, 216, 0.35)',
        },
        brand: {
          orange: '#F2B544',
          olive: '#16A6A3',
          teal: '#16A6A3',
          red: '#E45B62',
          green: '#299765',
          mint: '#D9F5E8',
        },
        navy: {
          DEFAULT: '#DFF1FF',
          dark: '#CDE8FF',
          card: '#F0F8FF',
          border: '#B9D9F5',
        },
        sky: {
          bg: '#DFF1FF',
          alt: '#CDE8FF',
          nav: '#B9DEFF',
          card: '#F0F8FF',
          panel: '#EDF7FF',
          primary: '#2784D8',
          teal: '#16A6A3',
          mint: '#D9F5E8',
          text: '#20364D',
          muted: '#5B7188',
          border: '#B9D9F5',
          warning: '#F2B544',
          critical: '#E45B62',
          healthy: '#299765',
        },
      },
      fontFamily: {
        display: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        body: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px -3px rgba(39, 132, 216, 0.25)',
        'glow-primary': '0 0 25px -4px rgba(39, 132, 216, 0.35)',
        'glow-red': '0 0 20px -4px rgba(228, 91, 98, 0.35)',
        glass: '0 4px 20px 0 rgba(32, 54, 77, 0.08)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
