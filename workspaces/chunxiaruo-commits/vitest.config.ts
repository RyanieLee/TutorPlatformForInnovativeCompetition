import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { environment: 'node', include: ['workspaces/chunxiaruo-commits/tests/**/*.test.ts'] } })
