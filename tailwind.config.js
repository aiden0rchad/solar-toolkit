/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        dark: {
          900: '#0b1120',
          800: '#111827',
          700: '#1e293b',
          600: '#334155',
        },
      },
    },
  },
  plugins: [],
}