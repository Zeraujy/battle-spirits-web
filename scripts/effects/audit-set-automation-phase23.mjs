import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const coverage=JSON.parse(fs.readFileSync(path.join(root,'data/effects/coverage.json'),'utf8'));
const target=Number(process.env.EFFECT_AUTOMATION_TARGET || 95);
const ok=new Set(['AUTOMATED','NO_EFFECT']);
const sets=[];
for(const [setCode,raw] of Object.entries(coverage.summary?.bySet||{}).sort(([a],[b])=>a.localeCompare(b))){
  const cards=coverage.cards.filter(c=>c.set===setCode);
  const automated=cards.filter(c=>ok.has(c.status)).length;
  const unresolved=cards.filter(c=>!ok.has(c.status));
  const pct=cards.length?Number((automated/cards.length*100).toFixed(1)):100;
  const unsupportedTriggers=[...new Set(unresolved.flatMap(c=>c.gaps?.unsupportedTriggers||[]))].sort();
  const unsupportedConditions=[...new Set(unresolved.flatMap(c=>c.gaps?.unsupportedConditions||[]))].sort();
  const unsupportedActions=[...new Set(unresolved.flatMap(c=>c.gaps?.unsupportedActions||[]))].sort();
  const complete=pct>=target && unsupportedTriggers.length===0 && unsupportedConditions.length===0 && unsupportedActions.length===0;
  sets.push({set:setCode,total:cards.length,automated,noEffect:cards.filter(c=>c.status==='NO_EFFECT').length,unresolved:unresolved.length,automationPercent:pct,unsupportedTriggers,unsupportedConditions,unsupportedActions,complete,unresolvedCards:unresolved.map(c=>({cardId:c.cardId,status:c.status}))});
}
const out={generatedAt:new Date().toISOString(),targetPercent:target,totalSets:sets.length,completeSets:sets.filter(s=>s.complete).length,sets};
fs.mkdirSync(path.join(root,'data/effect-migrations'),{recursive:true});
fs.writeFileSync(path.join(root,'data/effects/migrations/set-automation-phase23.json'),JSON.stringify(out,null,2)+'\n');
const md=['# Set-by-Set Automation — Phase 23','',`Target: >= ${target}% fully automated/no-effect cards per set, with no unsupported trigger/condition/action gaps.`,'',`Complete sets: ${out.completeSets}/${out.totalSets}`,'','| Set | Automated/No-effect | Unresolved | Coverage | Gate |','|---|---:|---:|---:|---|'];
for(const s of sets) md.push(`| ${s.set} | ${s.automated}/${s.total} | ${s.unresolved} | ${s.automationPercent}% | ${s.complete?'PASS':'BLOCKED'} |`);
md.push('','## Release blockers');
for(const s of sets.filter(x=>!x.complete)) md.push(`- **${s.set}**: ${s.unresolved} unresolved card(s); ${s.automationPercent}% automated/no-effect.`);
fs.mkdirSync(path.join(root,'docs/effects'),{recursive:true}); fs.writeFileSync(path.join(root,'docs/effects/set-by-set-automation-v5.1.0-phase23.md'),md.join('\n')+'\n');
console.log(`[phase23] ${out.completeSets}/${out.totalSets} sets meet the ${target}% automation gate.`); for(const s of sets) console.log(`${s.set}: ${s.automationPercent}% ${s.complete?'PASS':'BLOCKED'} (${s.unresolved} unresolved)`);
if(process.argv.includes('--enforce') && out.completeSets!==out.totalSets) process.exit(1);
