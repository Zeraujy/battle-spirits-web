import { spawnSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const root=process.cwd(); const commands=[
 ['effects audit',['node','scripts/effects/audit-card-effects.mjs','--check']],
 ['phase23 set gate',['node','scripts/effects/audit-set-automation.mjs','--enforce']],
 ['phase24 generated regressions',['node','--test','src/game/effectEngine/generatedCardRegression.test.js']],
 ['phase25 manual fallback gate',['node','scripts/effects/audit-manual-resolution.mjs','--enforce']],
 ['phase26 mechanics QA',['node','scripts/effects/audit-final-mechanics.mjs']],
 ['project verify',['npm','run','verify']],
 ['ui audit',['npm','run','ui:audit']],
 ['release audit',['npm','run','release:audit']],
 ['security audit',['npm','run','security:audit']]
];
const results=[]; for(const [name,cmd] of commands){ const r=spawnSync(cmd[0],cmd.slice(1),{cwd:root,encoding:'utf8'}); results.push({name,ok:r.status===0,status:r.status,stdout:(r.stdout||'').slice(-5000),stderr:(r.stderr||'').slice(-5000)}); console.log(`[phase27] ${name}: ${r.status===0?'PASS':'FAIL'}`); }
const out={generatedAt:new Date().toISOString(),releaseReady:results.every(r=>r.ok),results}; fs.mkdirSync(path.join(root,'data/effect-migrations'),{recursive:true}); fs.writeFileSync(path.join(root,'data/effects/migrations/release-qa-phase27.json'),JSON.stringify(out,null,2)+'\n'); if(!out.releaseReady) process.exit(1);
