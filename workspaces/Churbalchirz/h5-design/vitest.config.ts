import { defineConfig } from 'vitest/config'

// 业务规则测试不需要加载 uni-app 的页面编译插件。
export default defineConfig({ test: { environment: 'node', include: ['tests/**/*.test.ts'] } })
