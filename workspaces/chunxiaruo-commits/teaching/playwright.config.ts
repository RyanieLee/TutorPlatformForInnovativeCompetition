export default{
 testDir:'./tests',testMatch:/teaching-.*\.spec\.ts/,
 timeout:60000,expect:{timeout:8000},workers:1,retries:0,
 use:{baseURL:'http://127.0.0.1:5174',headless:true,trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{args:['--no-sandbox']}},
 outputDir:'./.local/browser-results',reporter:[['list']]
}

