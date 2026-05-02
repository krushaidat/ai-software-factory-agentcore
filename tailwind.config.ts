import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vuexy-inspired dark palette
        bg: '#28243d',
        surface: '#312d4b',
        raised: '#3b3559',
        card: '#3b3559',
        border: 'rgba(255,255,255,0.08)',
        'border-hi': '#8c57ff',
        text: '#e7e3fc',
        muted: '#a59ec9',
        dim: '#6e6b7b',
        accent: '#8c57ff',
        'accent-dim': 'rgba(140,87,255,0.16)',
        'accent-border': 'rgba(140,87,255,0.5)',
        crit: '#ff4c51',
        'crit-dim': 'rgba(255,76,81,0.16)',
        warn: '#ffb400',
        'warn-dim': 'rgba(255,180,0,0.16)',
        info: '#16b1ff',
        'info-dim': 'rgba(22,177,255,0.16)',
        ok: '#56ca00',
        'ok-dim': 'rgba(86,202,0,0.16)',
        purple: '#a08cff',
        'purple-dim': 'rgba(160,140,255,0.16)',
        orange: '#ff9f43',
        'orange-dim': 'rgba(255,159,67,0.16)',
        pink: '#ff5b9b',
        'pink-dim': 'rgba(255,91,155,0.16)',
      },
      fontFamily: {
        heading: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      maxWidth: {
        app: '960px',
      },
    },
  },
  plugins: [],
} satisfies Config
