import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
export default defineConfig(({ mode }) => ({ base: loadEnv(mode, '.', 'VITE_').VITE_BASE_PATH || '/', plugins: [uni()] }))
