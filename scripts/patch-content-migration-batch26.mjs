import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const cardsPath=path.join(root,'src/data/cards.json');
const raw=JSON.parse(fs.readFileSync(cardsPath,'utf8'));
const cards=Array.isArray(raw)?raw:raw.cards;
function card(id){const c=cards.find(x=>x.id===id&&x.set==='BSC49');if(!c)throw new Error(`Missing ${id}`);c.abilities??=[];c.effects??=[];return c;}
function replaceAbilities(c,list){c.abilities=list;c.effects=[];}
const source=(event,eventPlayer='any')=>({event,scope:'source',eventPlayer});
const trash=(event,eventPlayer='any')=>({event,scope:'controllerTrash',eventPlayer});

// BSC49-093 — Cassiopeia Seal LT
{
 const c=card('BSC49-093');
 replaceAbilities(c,[
  {id:'bsc49-093-flash-auto46',schemaVersion:2,trigger:source('magicFlash'),actions:[
    {type:'selectMultipleTargets',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit','ultimate'],ignoreEffectImmunity:true},maxTargets:2,asManyAsPossible:true,allowZero:true,onConfirm:[
      {type:'exhaust',target:'selected'},
      {type:'placeSourceInField'},
      {type:'addModifier',property:'cannotRefresh',operation:'set',value:1,selector:{selectedTargets:true},duration:'whileSourceExists'}
    ]}
  ]}
 ]);
}

// BSC49-102 — Mercury Goblet LT
{
 const c=card('BSC49-102');
 replaceAbilities(c,[
  {id:'bsc49-102-trash-auto46',schemaVersion:2,trigger:trash('cardExhausted','self'),conditions:[{type:'eventSourceCardType',cardType:'nexus'},{type:'eventSourceColor',color:'blue'}],actions:[{type:'chooseYesNo',yesActions:[{type:'returnToHand',target:'source'}]}]},
  {id:'bsc49-102-flash-auto46',schemaVersion:2,trigger:source('magicFlash'),actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit','ultimate'],lowestCostOnly:true,ignoreEffectImmunity:true},allowZero:false,onSelect:{type:'destroy'}}]}
 ]);
}

fs.writeFileSync(cardsPath,JSON.stringify(cards,null,2)+'\n');
const importPath=path.join(root,'tools/import-ready/BSC49/BSC49-091-102.json');
if(fs.existsSync(importPath)){
 const importCards=JSON.parse(fs.readFileSync(importPath,'utf8'));
 for(const id of ['BSC49-093','BSC49-102']){const src=cards.find(c=>c.id===id);const dst=importCards.find(c=>c.id===id);if(dst){dst.abilities=src.abilities;dst.effects=[];}}
 fs.writeFileSync(importPath,JSON.stringify(importCards,null,2)+'\n');
}
console.log('[batch26] patched BSC49 Wave 11 advanced Magic field/lowest-cost foundation (2 cards).');
