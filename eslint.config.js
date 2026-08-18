import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^[A-Z_]', varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // `toneForValue` is a token-class helper rather than a component, and it
    // lives in ui.jsx on purpose: it is the DOM half of the irradiance ramp and
    // belongs beside MonthStrip and RampLegend, which are its neighbours and its
    // only reason to exist. The cost is that editing ui.jsx full-reloads instead
    // of hot-swapping. Named explicitly, so any OTHER non-component export from
    // this file still fails the rule.
    files: ['src/components/ui.jsx'],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true, allowExportNames: ['toneForValue'] },
      ],
    },
  },
])
