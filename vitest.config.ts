import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/renderer/src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: ['src/renderer/src/**/*.{ts,tsx}'],
      exclude: [
        'src/renderer/src/test/**',
        'src/renderer/src/vite-env.d.ts',
        'src/renderer/src/main.tsx',
        '**/*.d.ts',
      ],
      // TODO: Incrementar gradualmente conforme se agregan más tests
      // Meta final: statements 70, branches 60, functions 70, lines 70
      thresholds: {
        statements: 3,
        branches: 50,
        functions: 30,
        lines: 3,
      },
    },
  },
})
