import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#04070d',
        surface: '#0a1019',
        raised: '#0f1724',
        card: '#131d2e',
        border: '#1a2744',
        'border-hi': '#0ea5a0',
        text: '#e2e8f0',
        muted: '#7a8ba5',
        dim: '#3e506a',
        accent: '#0ea5a0',
        'accent-dim': 'rgba(14,165,160,0.1)',
        'accent-border': 'rgba(14,165,160,0.3)',
        crit: '#ef4444',
        'crit-dim': 'rgba(239,68,68,0.1)',
        warn: '#f59e0b',
        'warn-dim': 'rgba(245,158,11,0.1)',
        info: '#3b82f6',
        'info-dim': 'rgba(59,130,246,0.1)',
        ok: '#10b981',
        'ok-dim': 'rgba(16,185,129,0.1)',
        purple: '#8b5cf6',
        'purple-dim': 'rgba(139,92,246,0.1)',
        orange: '#ff9900',
        'orange-dim': 'rgba(255,153,0,0.08)',
        pink: '#ec4899',
        'pink-dim': 'rgba(236,72,153,0.1)',
      },
      fontFamily: {
        heading: ['Outfit', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      maxWidth: {
        app: '960px',
      },
    },
  },
  plugins: [],
} satisfies Config
