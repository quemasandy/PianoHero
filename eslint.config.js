import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  // ── Global ignores ────────────────────────────────────────────
  {
    ignores: [
      'node_modules/**',
      'out/**',
      'release/**',
      'dist/**',
      'coverage/**',
      '.npm-cache/**',
      'scratch.js',
      'src/test-advance.js',
      'src/test-react.js',
    ],
  },

  // ── Base JS recommended ───────────────────────────────────────
  js.configs.recommended,

  // ── TypeScript strict ─────────────────────────────────────────
  ...tseslint.configs.strict,

  // ── React Hooks ───────────────────────────────────────────────
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // ── Project-specific overrides ────────────────────────────────
  {
    rules: {
      // Allow unused vars prefixed with _
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Allow explicit any in some cases (gradually tighten)
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // ── Prettier (must be last) ───────────────────────────────────
  eslintConfigPrettier
)
