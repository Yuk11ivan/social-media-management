/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // === Crystal Champagne Base ===
        crystal: {
          50: '#FCFAF7',
          100: '#F8F5F0',
          200: '#F0ECE3',
          300: '#E4DED2',
          400: '#C4BDB0',
          500: '#A0988B',
          600: '#7A7367',
          700: '#5C564C',
          800: '#3D3831',
          900: '#1E1B16',
        },
        // === Gilt Accent (香槟金) ===
        gilt: {
          50: '#FCFAF5',
          100: '#F7F2E5',
          200: '#EDE2CB',
          300: '#D9C9A8',
          400: '#C8B590',
          500: '#B8A278',
          600: '#A08A60',
          700: '#887248',
          800: '#6B5A38',
          900: '#473A20',
        },
        // === Warm accent tones ===
        warm: {
          rose: '#D4BCB0',
          bronze: '#C4A898',
          sand: '#E0D5CB',
        },
        // === Platform colors ===
        wechat: '#1EBD6A',
        xiaohongshu: '#F54A6A',
        douyin: '#1E1B16',
        weibo: '#E05244',
      },
      fontFamily: {
        heading: ['Outfit', 'Inter', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: { DEFAULT: '0.75rem' },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'stagger-fade': 'stagger-fade 0.6s ease-out forwards',
        float: 'float 5s ease-in-out infinite',
        shimmer: 'shimmer 6s linear infinite',
        'crystal-shine': 'crystal-shine 4s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'stagger-fade': { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        shimmer: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
        'crystal-shine': { '0%,100%': { opacity: '0.2' }, '50%': { opacity: '0.6' } },
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      boxShadow: {
        'crystal-sm': '0 1px 3px rgba(30,27,22,0.04), 0 0 0 1px rgba(184,160,106,0.06)',
        'crystal-md': '0 4px 16px rgba(30,27,22,0.05), 0 0 0 1px rgba(184,160,106,0.1)',
        'crystal-lg': '0 8px 32px rgba(30,27,22,0.06), 0 0 0 1px rgba(184,160,106,0.15)',
        'gilt-sm': '0 2px 8px rgba(184,160,106,0.15)',
        'gilt-md': '0 4px 16px rgba(184,160,106,0.2), 0 0 0 1px rgba(184,160,106,0.2)',
      },
    },
  },
  plugins: [],
};
