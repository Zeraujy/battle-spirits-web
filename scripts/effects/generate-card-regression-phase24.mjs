import fs from 'node:fs'; import path from 'node:path';
const root=process.cwd(); const cov=JSON.parse(fs.readFileSync(path.join(root,'data/effect-coverage.json'),'utf8'));
const scenarios=[];
for(const card of cov.cards){
  if(!['AUTOMATED','NO_EFFECT'].includes(card.status)) continue;
  const automatedEntries=(card.entries||[]).filter(e=>e.status==='AUTOMATED');
  scenarios.push({cardId:card.cardId,set:card.set,status:card.status,expected:{noUnsupportedActions:(card.gaps?.unsupportedActions||[]).length===0,noUnsupportedConditions:(card.gaps?.unsupportedConditions||[]).length===0,noUnsupportedTriggers:(card.gaps?.unsupportedTriggers||[]).length===0,automatedEntryIds:automatedEntries.map(e=>e.id)}});
}
const out={generatedAt:new Date().toISOString(),scenarioCount:scenarios.length,scenarios}; fs.mkdirSync(path.join(root,'data'),{recursive:true}); fs.writeFileSync(path.join(root,'data/effect-regression-scenarios.json'),JSON.stringify(out,null,2)+'\n'); console.log(`[phase24] generated ${scenarios.length} card regression scenario(s).`);
