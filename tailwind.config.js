/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        vazir: ['Vazirmatn', 'sans-serif'],
      },
      colors: {
        digi: {
          red: '#ef394e',
          darkRed: '#d32f2f',
          accent: '#008eb2',
        }
      }
    },
  },
  plugins: [],
}
