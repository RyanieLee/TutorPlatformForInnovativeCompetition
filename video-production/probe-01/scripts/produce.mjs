import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=fileURLToPath(new URL('../',import.meta.url));
for(const [exe,args] of [[process.execPath,['scripts/capture.mjs']],[process.env.PROBE_PYTHON||'python',['scripts/render.py']]]){const r=spawnSync(exe,args,{cwd:dir,stdio:'inherit',env:process.env});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1)}
