import fs from 'node:fs';
import path from 'node:path';
import { normalizeCanonicalEvent } from '../../src/game/effectEngine/canonicalEvents.js';

const root=process.cwd();
const cardPath=path.join(root,'src/data/cards.json');
const WRITE=process.argv.includes('--write');
const setArg=process.argv.find(a=>a.startsWith('--set='));
const onlySet=setArg?setArg.split('=')[1].toUpperCase():null;
const cards=JSON.parse(fs.readFileSync(cardPath,'utf8'));
let links=0; const changed=[]; const skipped=[];
const levels=e=>Array.isArray(e?.levels)?e.levels.map(Number):[];
const overlaps=(a,b)=>!a.length||!b.length||a.some(x=>b.includes(x));
const evt=e=>normalizeCanonicalEvent(e?.trigger?.event ?? e?.event ?? e?.timing ?? e?.type ?? '');
for(const card of cards){
  if(onlySet && String(card.set||'').toUpperCase()!==onlySet) continue;
  const abilities=Array.isArray(card.abilities)?card.abilities:[];
  const effects=Array.isArray(card.effects)?card.effects:[];
  let did=false;
  for(const effect of effects){
    if(effect.automationRef) continue;
    if(effect.actions?.length||effect.operations?.length||effect.ops?.length) continue;
    const event=evt(effect); if(!event) continue;
    const cand=abilities.filter(a=>a.id && evt(a)===event && overlaps(levels(effect),levels(a)) && ((a.actions?.length||a.operations?.length||a.ops?.length)||a.modifiers));
    if(cand.length===1){ effect.automationRef=cand[0].id; links++; did=true; }
    else if(cand.length>1){
      const exact=cand.filter(a=>JSON.stringify(levels(a))===JSON.stringify(levels(effect)));
      if(exact.length===1){ effect.automationRef=exact[0].id; links++; did=true; }
      else skipped.push({cardId:card.id,effectId:effect.id,event,candidates:cand.map(x=>x.id)});
    }
  }
  if(did) changed.push(card.id);
}
const report={generatedAt:new Date().toISOString(),set:onlySet||'ALL',write:WRITE,links,changedCards:changed.length,changed,ambiguous:skipped};
fs.mkdirSync(path.join(root,'data/effect-migrations'),{recursive:true});
fs.writeFileSync(path.join(root,'data/effect-migrations',`display-normalization-${(onlySet||'ALL').toLowerCase()}.json`),JSON.stringify(report,null,2)+'\n');
if(WRITE) fs.writeFileSync(cardPath,JSON.stringify(cards,null,2)+'\n');
console.log(`[normalize-display] ${onlySet||'ALL'}: ${links} link(s), ${changed.length} card(s), ${skipped.length} ambiguous.`);
