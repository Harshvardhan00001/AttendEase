/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        foreground: 'var(--text-primary)',
        brand: {
          DEFAULT: 'var(--brand-primary)',
          hover: 'var(--brand-primary-hover)',
          light: '#4F46E5',
          dark: '#6366F1',
        },
        scan: {
          DEFAULT: 'var(--scan-accent)',
          cyan: '#06B6D4',
        },
        verified: {
          DEFAULT: 'var(--status-verified)',
          emerald: '#10B981',
        },
        warning: {
          DEFAULT: 'var(--status-warning)',
          amber: '#F59E0B',
        },
        danger: {
          DEFAULT: 'var(--status-proxy-blocked)',
          rose: '#F43F5E',
        },
        obsidian: {
          950: '#090D16',
          900: '#111827',
          800: '#1F2937',
          700: '#374151',
        },
        surface: {
          primary: 'var(--bg-primary)',
          card: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
          border: 'var(--border-subtle)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
      },
      boxShadow: {
        'scan-cyan': '0 0 25px -4px rgba(6, 182, 212, 0.45), 0 0 8px -2px rgba(6, 182, 212, 0.35)',
        'scan-emerald': '0 0 25px -4px rgba(16, 185, 129, 0.5), 0 0 8px -2px rgba(16, 185, 129, 0.4)',
        'scan-danger': '0 0 25px -4px rgba(244, 63, 94, 0.5), 0 0 8px -2px rgba(244, 63, 94, 0.4)',
        'brand-glow': '0 0 22px -3px rgba(79, 70, 229, 0.35)',
        'cyber-glow': '0 0 20px -3px rgba(6, 182, 212, 0.3)',
      },
    },
  },
  plugins: [],
}
