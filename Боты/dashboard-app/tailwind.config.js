/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#8B0000',
        accent: '#C41E3A',
        'chart-search': '#8B0000',
        'chart-rsya': '#4169E1',
        'chart-maps': '#FF69B4',
      },
    },
  },
  plugins: [],
}
