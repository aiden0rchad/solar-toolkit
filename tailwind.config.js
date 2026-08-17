/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // surfaces
        paper: '#f9f9f7',
        surface: '#ffffff',
        field: '#f4f3ef',
        // ink
        ink: {
          DEFAULT: '#0b0b0b',
          2: '#52514e',
          // Darker than the spec's #898781, which measured 3.59:1 on white and failed AA
          // at the 11–13px sizes it is used at. See the note in src/index.css.
          3: '#6f6c67',
        },
        // lines
        line: '#e4e2dd',
        baseline: '#c3c2b7',
        'chart-grid': '#e1e0d9',
        // accent — exactly one
        accent: {
          DEFAULT: '#b45309',
          wash: '#f7f0e3',
        },
        // money semantics (text only, used sparingly)
        good: '#006300',
        bad: '#d03b3b',
        // modal backdrop — the one ink-derived alpha in the system
        scrim: 'rgba(11,11,11,0.35)',
      },
      boxShadow: {
        // the single permitted shadow: modals only, never cards
        modal: '0 10px 30px rgba(11,11,11,0.12)',
      },
    },
  },
  plugins: [],
}
