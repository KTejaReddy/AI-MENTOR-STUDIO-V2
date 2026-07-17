import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--surface)',
          50: 'var(--surface-50)',
          100: 'var(--surface-100)',
          150: 'var(--surface-150)',
          200: 'var(--surface-200)',
          250: 'var(--surface-250)',
          300: 'var(--surface-300)',
          400: 'var(--surface-400)',
        },
        border: {
          DEFAULT: 'var(--border)',
          light: 'var(--border-light)',
          lighter: 'var(--border-lighter)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
          dark: 'var(--accent-dark)',
          muted: 'var(--accent-muted)',
        },
        teal: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          light: 'var(--muted-light)',
          dark: 'var(--muted-dark)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(20, 184, 166, 0.08)',
        'glow': '0 0 25px rgba(20, 184, 166, 0.12)',
        'glow-lg': '0 0 40px rgba(20, 184, 166, 0.16)',
        'panel': '0 0 0 1px var(--shadow-border), 0 8px 32px rgba(0, 0, 0, 0.4)',
        'card': '0 0 0 1px var(--shadow-border), 0 4px 16px rgba(0, 0, 0, 0.3)',
        'elevated': '0 0 0 1px var(--shadow-border), 0 12px 48px rgba(0, 0, 0, 0.5)',
        'glow-accent': '0 0 20px var(--glow-accent), 0 4px 12px rgba(0, 0, 0, 0.2)',
        'glow-accent-lg': '0 0 30px var(--glow-accent), 0 6px 20px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'fade-in-down': 'fadeInDown 0.2s ease-out',
        'fade-in-left': 'fadeInLeft 0.25s ease-out',
        'fade-in-right': 'fadeInRight 0.25s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'slide-up-enter': 'slideUpEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down-enter': 'slideDownEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in-enter': 'scaleInEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'aurora': 'aurora 20s ease-in-out infinite',
        'grid-scroll': 'gridScroll 30s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInRight: {
          '0%': { opacity: '0', transform: 'translateX(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.6' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px var(--glow-accent)' },
          '50%': { boxShadow: '0 0 24px var(--glow-accent), 0 0 48px var(--glow-purple)' },
        },
        slideUpEnter: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDownEnter: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleInEnter: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        aurora: {
          '0%': { transform: 'translate(0%, 0%) rotate(0deg)' },
          '25%': { transform: 'translate(5%, -5%) rotate(2deg)' },
          '50%': { transform: 'translate(-3%, 3%) rotate(-1deg)' },
          '75%': { transform: 'translate(2%, -2%) rotate(1deg)' },
          '100%': { transform: 'translate(0%, 0%) rotate(0deg)' },
        },
        gridScroll: {
          '0%': { transform: 'perspective(500px) rotateX(60deg) translateZ(0)' },
          '100%': { transform: 'perspective(500px) rotateX(60deg) translateZ(50px)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
