import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const cardsPath=path.join(root,'src/data/cards.json');
const raw=JSON.parse(fs.readFileSync(cardsPath,'utf8'));
const cards=Array.isArray(raw)?raw:raw.cards;
function card(id){const c=cards.find(x=>x.id===id&&x.set==='BSC49');if(!c)throw new Error(`Missing ${id}`);c.abilities??=[];c.effects??=[];return c;}
function replaceAbilities(c,list){c.abilities=list;c.effects=[];}
const source=(event,eventPlayer='any')=>({event,scope:'source',eventPlayer});
const hand=(event,eventPlayer='any')=>({event,scope:'controllerHand',eventPlayer});

// BSC49-094 — Reboot Code LT
{
 const c=card('BSC49-094');
 replaceAbilities(c,[
  {id:'bsc49-094-hand-protection-auto47',schemaVersion:2,trigger:hand('startStep','any'),actions:[
    {type:'addModifier',property:'unaffectedByOpponentEffects',operation:'set',value:1,selector:{owner:'self',cardId:'BSC49-094'},duration:'thisTurn'}
  ]},
  {id:'bsc49-094-attack-cost-auto47',schemaVersion:2,trigger:hand('attackStep','opponent'),actions:[
    {type:'addModifier',property:'printedCostOverride',operation:'set',value:2,selector:{owner:'self',cardId:'BSC49-094'},duration:'thisTurn'},
    {type:'addModifier',property:'unaffectedByOpponentEffects',operation:'set',value:1,selector:{owner:'self',cardId:'BSC49-094'},duration:'thisTurn'}
  ]},
  {id:'bsc49-094-flash-auto47',schemaVersion:2,trigger:source('magicFlash'),actions:[
    {type:'selectMultipleTargets',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],exhausted:true,braved:true},maxTargets:99,asManyAsPossible:true,allowZero:true,onConfirm:[{type:'draw',count:0}],afterIfAny:[{type:'refresh',target:'selected'}]},
    {type:'selectMultipleTargets',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],exhausted:true,braved:false},maxTargets:99,asManyAsPossible:true,allowZero:true,onConfirm:[{type:'draw',count:0}],afterIfAny:[
      {type:'refresh',target:'selected'},
      {type:'addModifier',property:'cannotAttack',operation:'set',value:1,selector:{selectedTargets:true},duration:'thisTurn'}
    ]}
  ]}
 ]);
}

fs.writeFileSync(cardsPath,JSON.stringify(cards,null,2)+'\n');
const importPath=path.join(root,'tools/import-ready/BSC49/BSC49-091-102.json');
if(fs.existsSync(importPath)){
 const importCards=JSON.parse(fs.readFileSync(importPath,'utf8'));
 for(const id of ['BSC49-094']){const src=cards.find(c=>c.id===id);const dst=importCards.find(c=>c.id===id);if(dst){dst.abilities=src.abilities;dst.effects=[];}}
 fs.writeFileSync(importPath,JSON.stringify(importCards,null,2)+'\n');
}
console.log('[batch27] patched BSC49 Wave 12 Reboot Code LT hand protection/cost + selective refresh lock.');
