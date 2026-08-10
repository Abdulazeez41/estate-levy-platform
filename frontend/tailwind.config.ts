import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './store/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#1C1B17',
        'ink-soft': '#5B584E',
        paper: '#F3EFE3',
        panel: '#FFFFFF',
        line: 'rgba(28,27,23,0.13)',
        'green-deep': '#1E4638',
        'green-deep-2': '#173629',
        'green-bright': '#2F7D57',
        'green-wash': '#E4EFE6',
        gold: '#BE8A2E',
        'gold-wash': '#F6E9CE',
        amber: '#B5791C',
        'amber-wash': '#F3E4C6',
        rust: '#AE3A2C',
        'rust-wash': '#F5DEDA',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(28,27,23,0.06), 0 8px 20px -12px rgba(28,27,23,0.18)',
      },
      borderRadius: {
        panel: '16px',
      },
      fontFamily: {
        heading: ['var(--font-zilla)', 'serif'],
        body: ['var(--font-work)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
