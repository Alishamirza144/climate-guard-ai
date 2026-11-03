import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--cg-white-rgb) / <alpha-value>)',
        primary: {
          DEFAULT: '#2389D7',
          dark: '#1664A3',
          light: '#8ED8F5',
          glow: 'rgba(35, 137, 215, 0.45)',
        },
        cyan: {
          DEFAULT: '#25C5DC',
          dark: '#138B9C',
          light: '#8ED8F5',
          glow: 'rgba(37, 197, 220, 0.45)',
        },
        lime: {
          DEFAULT: '#2389D7',
          dark: '#1664A3',
          light: '#25C5DC',
          glow: 'rgba(35, 137, 215, 0.4)',
        },
        brand: {
          orange: '#F4BC4D',
          olive: '#25C5DC',
          teal: '#25C5DC',
          red: '#F06470',
          green: '#35C58B',
          mint: '#8ED8F5',
        },
        navy: {
          DEFAULT: '#071A33',
          secondary: '#0B2545',
          nav: '#102F50',
          card: '#12385C',
          panel: '#0E2B49',
          border: '#285274',
          text: '#F3F8FF',
          muted: '#B6C9DC',
        },
        sky: {
          bg: '#071A33',
          alt: '#0B2545',
          nav: '#102F50',
          card: '#12385C',
          panel: '#0E2B49',
          primary: '#2389D7',
          teal: '#25C5DC',
          mint: '#8ED8F5',
          text: '#F3F8FF',
          muted: '#B6C9DC',
          border: '#285274',
          warning: '#F4BC4D',
          critical: '#F06470',
          healthy: '#35C58B',
        },
      },
      fontFamily: {
        display: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        body: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px -3px rgba(35, 137, 215, 0.35)',
        'glow-primary': '0 0 30px -4px rgba(37, 197, 220, 0.45)',
        'glow-cyan': '0 0 25px -3px rgba(37, 197, 220, 0.4)',
        'glow-red': '0 0 25px -4px rgba(240, 100, 112, 0.45)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
