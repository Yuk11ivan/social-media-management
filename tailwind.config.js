/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'wechat': '#07C160',
        'xiaohongshu': '#FF2442',
        'douyin': '#000000',
        'weibo': '#E6162D',
        'accent': {
          primary: '#10b981',
          light: '#d1fae5',
          dark: '#059669',
        },
        'paper': {
          primary: '#faf9f6',
          secondary: '#f5f3ee',
        },
        'text': {
          primary: '#1a1a1a',
          secondary: '#6b6b6b',
          muted: '#a3a3a3',
        },
        'border': '#e5e5e0',
      },
      fontFamily: {
        'heading': ['Outfit', 'sans-serif'],
        'body': ['Geist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'morph': 'morph 20s ease-in-out infinite',
        'shimmer': 'shimmer-rotate 3s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s var(--ease-smooth)',
        'slide-up': 'slide-up 0.5s var(--ease-smooth)',
        'stagger-fade': 'stagger-fade 0.6s var(--ease-smooth) forwards',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'stagger-fade': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
