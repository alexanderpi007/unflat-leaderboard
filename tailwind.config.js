/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html'],
  safelist: [
    'text-error/70',
    'bg-accent/20',
    'hover:bg-white/[0.02]',
    'min-w-[540px]',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#00041b',
        'bg-card': 'rgba(255, 255, 255, 0.03)',
        'text-primary': '#f5f6ff',
        'text-secondary': 'rgba(255, 255, 255, 0.5)',
        'text-muted': 'rgba(255, 255, 255, 0.35)',
        'accent': '#6366f1',
        'accent-light': '#818cf8',
        'accent-blue': '#6198ff',
        'success': '#4ade80',
        'error': '#f87171',
        'border-subtle': 'rgba(255, 255, 255, 0.08)',
        'border-hover': 'rgba(255, 255, 255, 0.15)',
      }
    }
  },
  plugins: [],
}
