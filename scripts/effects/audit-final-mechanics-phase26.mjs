import { spawnSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const root=process.cwd(); const checks=[
 ['core gameplay tests',['bash','-lc','node --test src/game/*.test.js']],
 ['effect engine phases 1-24',['bash','-lc','node --test src/game/effectEngine/*.test.js']],
 ['online authority',['node','--test','server/matches/effectDecisionAuthority.test.js','server/matches/matchSession.test.js','server/matches/stateSync.test.js']],
 ['full regression',['node','scripts/regression/run-full-regression-v500.mjs']]
];
const results=[]; for(const [name,cmd] of checks){ const run=spawnSync(cmd[0],cmd.slice(1),{cwd:root,encoding:'utf8'}); results.push({name,ok:run.status===0,status:run.status,stdout:(run.stdout||'').slice(-4000),stderr:(run.stderr||'').slice(-4000)}); console.log(`[phase26] ${name}: ${run.status===0?'PASS':'FAIL'}`); }
const out={generatedAt:new Date().toISOString(),passed:results.every(r=>r.ok),results}; fs.mkdirSync(path.join(root,'data/effect-migrations'),{recursive:true}); fs.writeFileSync(path.join(root,'data/effects/migrations/final-mechanics-phase26.json'),JSON.stringify(out,null,2)+'\n'); if(!out.passed) process.exit(1);
