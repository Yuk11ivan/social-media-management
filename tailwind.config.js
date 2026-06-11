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
      }
    },
  },
  plugins: [],
}
