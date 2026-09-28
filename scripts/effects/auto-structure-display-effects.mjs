import fs from 'node:fs';
import path from 'node:path';
import { normalizeCanonicalEvent } from '../../src/game/effectEngine/canonicalEvents.js';
const root=process.cwd(); const file=path.join(root,'src/data/cards.json'); const WRITE=process.argv.includes('--write');
const cards=JSON.parse(fs.readFileSync(file,'utf8')); let converted=0; const details=[];
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function parseAction(text){
  const t=clean(text).replace(/^you may\s+/i,'').replace(/^may\s+/i,'');
  let m;
  if((m=t.match(/^Draw (\d+) cards?\.?$/i))) return [{type:'draw',amount:+m[1]}];
  if((m=t.match(/^This (?:Spirit|Ultimate) gains \+(\d+) BP (?:for|during) (?:the|this) (battle|turn)\.?$/i))) return [{type:'modifyBP',target:'source',amount:+m[1],duration:m[2].toLowerCase()}];
  if((m=t.match(/^Destroy (?:1|one) opposing Spirit(?:\/Ultimate)? with (\d+) BP or less\.?$/i))) return [{type:'selectTarget',selector:{owner:'opponent',cardTypes:['spirit'],maxBP:+m[1]},allowZero:true,onSelect:{type:'destroy'}}];
  if(/^Exhaust (?:1|one) opposing Spirit\.?$/i.test(t)) return [{type:'selectTarget',selector:{owner:'opponent',cardTypes:['spirit']},allowZero:true,onSelect:{type:'exhaust'}}];
  if(/^Refresh this (?:Spirit|Ultimate)\.?$/i.test(t)) return [{type:'refresh',target:'source'}];
  if((m=t.match(/^Put (\d+) Cores? from the Void on this (?:Spirit|Ultimate)\.?$/i))) return [{type:'addCoreFromVoid',target:'self',amount:+m[1]}];
  if((m=t.match(/^Put (\d+) Cores? from the Void (?:into|in) your Reserve\.?$/i))) return [{type:'addCoreToReserveFromVoid',amount:+m[1]}];
  if(/^Return (?:1|one) opposing Spirit to (?:their|its owner's) hand\.?$/i.test(t)) return [{type:'selectTarget',selector:{owner:'opponent',cardTypes:['spirit']},allowZero:true,onSelect:{type:'returnToHand'}}];
  if(/^Return (?:1|one) exhausted opposing Spirit to the top of its owner's deck\.?$/i.test(t)) return [{type:'selectTarget',selector:{owner:'opponent',cardTypes:['spirit'],exhausted:true},allowZero:true,onSelect:{type:'returnToTopDeck'}}];
  if((m=t.match(/^One opposing Spirit(?:\/Ultimate)? gets -(\d+) BP during this turn\.?$/i))) return [{type:'selectTarget',selector:{owner:'opponent',cardTypes:['spirit']},allowZero:true,onSelect:{type:'modifyBP',amount:-Number(m[1]),duration:'turn'}}];
  return null;
}
for(const card of cards){
  card.effects ||= []; card.abilities ||= [];
  for(const e of card.effects){
    if(e.automationRef || e.actions?.length || e.operations?.length || e.ops?.length) continue;
    const event=normalizeCanonicalEvent(e.timing ?? e.event ?? e.type ?? ''); if(!event) continue;
    const text=e.text?.en ?? e.text ?? ''; const actions=parseAction(text); if(!actions) continue;
    const id=`${String(e.id||card.id).replace(/-display$/,'')}-auto23`;
    if(card.abilities.some(a=>a.id===id)){e.automationRef=id; continue;}
    const ability={id,schemaVersion:2,trigger:{event,scope:'source',eventPlayer:'any'},actions};
    if(Array.isArray(e.levels)&&e.levels.length) ability.levels=e.levels;
    card.abilities.push(ability); e.automationRef=id; converted++; details.push({cardId:card.id,effectId:e.id,abilityId:id,event,text:clean(text)});
  }
}
const report={generatedAt:new Date().toISOString(),write:WRITE,converted,details}; fs.mkdirSync(path.join(root,'data/effect-migrations'),{recursive:true}); fs.writeFileSync(path.join(root,'data/effect-migrations/auto-structure-phase23.json'),JSON.stringify(report,null,2)+'\n'); if(WRITE) fs.writeFileSync(file,JSON.stringify(cards,null,2)+'\n'); console.log(`[phase23:auto] converted ${converted} display effect(s).`);
