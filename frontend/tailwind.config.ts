import type { Config } from 'tailwindcss';

/**
 * Design system do Soundscape.
 * As cores base ficam aqui; a paleta dinamica de cada usuario (extraida das capas
 * dos albuns) e injetada em runtime como CSS custom properties `--vibe-*`
 * e consumida pelas classes `vibe-*`.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#050506',
          900: '#0a0a0c',
          850: '#0e0e11',
          800: '#131317',
          700: '#1a1a20',
          600: '#24242c',
          500: '#32323c',
          400: '#4a4a57',
        },
        chalk: {
          DEFAULT: '#f4f4f5',
          soft: '#d7d7dc',
          muted: '#8f8f9c',
          faint: '#5f5f6b',
        },
        spotify: {
          DEFAULT: '#1db954',
          bright: '#1ed760',
          dark: '#14833b',
        },
        accent: {
          violet: '#8b5cf6',
          pink: '#ec4899',
          orange: '#fb923c',
          cyan: '#22d3ee',
          amber: '#fbbf24',
        },
        vibe: {
          primary: 'var(--vibe-primary)',
          secondary: 'var(--vibe-secondary)',
          tertiary: 'var(--vibe-tertiary)',
        },
      },
      fontFamily: {
        display: ['Syne', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        'display-xl': ['clamp(2.75rem, 9vw, 7rem)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(2.25rem, 6vw, 4.5rem)', { lineHeight: '1', letterSpacing: '-0.025em' }],
        'display-md': ['clamp(1.75rem, 4vw, 3rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
      gridTemplateColumns: {
        // Heatmap de escuta: uma coluna por hora do dia.
        24: 'repeat(24, minmax(0, 1fr))',
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(255 255 255 / 0.06), 0 18px 60px -20px rgb(0 0 0 / 0.9)',
        'glow-spotify': '0 0 42px -8px rgb(29 185 84 / 0.55)',
        'glow-vibe': '0 0 60px -14px var(--vibe-primary)',
        card: '0 1px 0 0 rgb(255 255 255 / 0.05) inset, 0 24px 48px -32px rgb(0 0 0 / 0.9)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgb(255 255 255 / 0.035) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.035) 1px, transparent 1px)',
        'vibe-gradient':
          'linear-gradient(135deg, var(--vibe-primary) 0%, var(--vibe-secondary) 50%, var(--vibe-tertiary) 100%)',
        'noise':
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.32'/%3E%3C/svg%3E\")",
      },
      backgroundSize: {
        grid: '48px 48px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'spin-slow': {
          '100%': { transform: 'rotate(360deg)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'bar-bounce': {
          '0%, 100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.24, 0, 0.38, 1) infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
        'gradient-pan': 'gradient-pan 8s ease infinite',
        'bar-bounce': 'bar-bounce 0.9s ease-in-out infinite',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
