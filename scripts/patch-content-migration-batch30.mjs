import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const cardsPath=path.join(root,'src/data/cards.json');
const raw=JSON.parse(fs.readFileSync(cardsPath,'utf8'));
const cards=Array.isArray(raw)?raw:raw.cards;
function card(id){const c=cards.find(x=>x.id===id&&x.set==='BSC49');if(!c)throw new Error(`Missing ${id}`);c.abilities??=[];c.effects??=[];return c;}
function replaceAbilities(c,list){c.abilities=list;}

// BSC49-095 — Delta Barrier LT
{
 const c=card('BSC49-095');
 replaceAbilities(c,[
  {
   id:'bsc49-095-immediate-auto50',schemaVersion:2,
   trigger:{event:'lifeDecreased',scope:'controllerHand',eventPlayer:'self'},
   conditions:{all:[{type:'eventCause',value:'effect'},{type:'eventSourceIsOpponent'}]},
   actions:[{type:'chooseYesNo',yesActions:[
    {type:'dispatchSourceEvent',event:'magicFlash',context:{usedWithoutCost:true,immediateUse:true}},
    {type:'moveCard',target:'source',destination:'trash'}
   ]}]
  },
  {
   id:'bsc49-095-flash-auto50',schemaVersion:2,
   trigger:{event:'magicFlash',scope:'source',eventPlayer:'self'},
   actions:[
    {type:'setTurnProtection',player:'self',protection:{type:'lifeCannotBecomeZeroFromOpponentEffects'}},
    {type:'setTurnProtection',player:'self',protection:{type:'lifeCannotBecomeZeroFromOpponentHighCostAttacks',minimumCost:4}}
   ]
  }
 ]);
 for(const e of c.effects||[]){
  if(e.id==='bsc49-095-immediate') e.automationRef='bsc49-095-immediate-auto50';
  if(e.id==='bsc49-095-flash') e.automationRef='bsc49-095-flash-auto50';
 }
}
fs.writeFileSync(cardsPath,JSON.stringify(cards,null,2)+'\n');
const importPath=path.join(root,'tools/import-ready/BSC49/BSC49-091-102.json');
if(fs.existsSync(importPath)){
 const importCards=JSON.parse(fs.readFileSync(importPath,'utf8'));
 const src=cards.find(c=>c.id==='BSC49-095'); const dst=importCards.find(c=>c.id==='BSC49-095');
 if(dst){dst.abilities=src.abilities;dst.effects=src.effects;}
 fs.writeFileSync(importPath,JSON.stringify(importCards,null,2)+'\n');
}
console.log('[batch30] patched Delta Barrier LT reactive free-use bridge and Life floor protections.');
