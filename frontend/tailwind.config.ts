import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--cg-white-rgb) / <alpha-value>)',
        primary: {
          DEFAULT: '#0B5239',
          dark: '#073625',
          light: '#116d4c',
          glow: 'rgba(11, 82, 57, 0.4)',
        },
        lime: {
          DEFAULT: 'rgb(var(--cg-lime-rgb) / <alpha-value>)',
          dark: 'rgb(var(--cg-lime-dark-rgb) / <alpha-value>)',
          light: 'rgb(var(--cg-lime-light-rgb) / <alpha-value>)',
          glow: 'rgba(175, 209, 127, 0.35)',
        },
        brand: {
          orange: 'rgb(var(--cg-orange-rgb) / <alpha-value>)',
          olive: 'rgb(var(--cg-olive-rgb) / <alpha-value>)',
          teal: 'rgb(var(--cg-teal-rgb) / <alpha-value>)',
          red: 'rgb(var(--cg-red-rgb) / <alpha-value>)',
        },
        navy: {
          DEFAULT: 'rgb(var(--cg-navy-rgb) / <alpha-value>)',
          dark: 'rgb(var(--cg-navy-dark-rgb) / <alpha-value>)',
          card: 'rgb(var(--cg-navy-card-rgb) / <alpha-value>)',
          border: 'rgb(var(--cg-white-rgb) / 0.1)',
        },
      },
      fontFamily: {
        display: ['Arial', 'sans-serif'],
        body: ['system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px -5px rgba(175, 209, 127, 0.3)',
        'glow-primary': '0 0 30px -5px rgba(11, 82, 57, 0.5)',
        'glow-red': '0 0 25px -5px rgba(229, 72, 77, 0.35)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
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
