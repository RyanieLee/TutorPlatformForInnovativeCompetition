import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir:'./e2e', timeout:90000, expect:{timeout:10000}, workers:1, retries:0,
  reporter:[['list'],['html',{open:'never'}]],
  use:{actionTimeout:10000,trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:[
    {command:'node scripts/e2e-api.mjs',url:'http://127.0.0.1:3001/health',timeout:120000,reuseExistingServer:false,env:{PORT:'3001',CORS_ORIGINS:'http://127.0.0.1:5174'}},
    {command:'node scripts/e2e-api.mjs',url:'http://127.0.0.1:3002/health',timeout:120000,reuseExistingServer:false,env:{PORT:'3002',CORS_ORIGINS:'http://127.0.0.1:5175'}},
    {command:'npm run dev:h5 -- --host 127.0.0.1 --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:false,env:{VITE_DATA_MODE:'mock'}},
    {command:'npm run dev:h5 -- --host 127.0.0.1 --port 5174',url:'http://127.0.0.1:5174',reuseExistingServer:false,env:{VITE_DATA_MODE:'api',VITE_API_BASE_URL:'http://127.0.0.1:3001'}},
    {command:'npm run dev:h5 -- --host 127.0.0.1 --port 5175',url:'http://127.0.0.1:5175',reuseExistingServer:false,env:{VITE_DATA_MODE:'api',VITE_API_BASE_URL:'http://127.0.0.1:3002'}}
  ],
  projects:[
    {name:'mock-desktop',use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5173'}},
    {name:'mock-mobile',use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:5173'}},
    {name:'api-desktop',use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5174'}},
    {name:'api-mobile',use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:5175'}}
  ]
})
