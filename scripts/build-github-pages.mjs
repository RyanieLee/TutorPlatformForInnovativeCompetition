import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const result = spawnSync(process.execPath, [require.resolve('@dcloudio/vite-plugin-uni/bin/uni.js'), 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DATA_MODE: 'mock', VITE_API_BASE_URL: '', VITE_BASE_PATH: '/TutorPlatformForInnovativeCompetition/' },
})
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status || 1)
writeFileSync('dist/build/h5/.nojekyll', '')
console.log('GitHub Pages files ready: dist/build/h5 (publish its contents at gh-pages root).')
