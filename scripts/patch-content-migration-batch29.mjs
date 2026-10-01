import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const cardsPath=path.join(root,'src/data/cards.json');
const raw=JSON.parse(fs.readFileSync(cardsPath,'utf8'));
const cards=Array.isArray(raw)?raw:raw.cards;
function card(id){const c=cards.find(x=>x.id===id&&x.set==='BSC49');if(!c)throw new Error(`Missing ${id}`);c.abilities??=[];c.effects??=[];return c;}
function replaceAbilities(c,list){c.abilities=list;c.effects=[];}
const source=(event,eventPlayer='any')=>({event,scope:'source',eventPlayer});

// BSC49-099 — Wig Bind LT
{
 const c=card('BSC49-099');
 replaceAbilities(c,[
  {id:'bsc49-099-flash-auto49',schemaVersion:2,trigger:source('magicFlash','self'),actions:[
   {type:'addModifier',property:'cannotAttack',operation:'set',value:1,selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],hasEffectText:true},duration:'thisTurn'},
   {type:'addModifier',property:'cannotBlock',operation:'set',value:1,selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],hasEffectText:true},duration:'thisTurn'},
   {type:'chooseYesNo',yesActions:[
    {type:'selectMultipleTargets',selector:{owner:'self',zones:['trash'],familiesAll:['Devotee'],familiesAny:['Astral Soul','Galaxian']},minTargets:5,maxTargets:5,onConfirm:[
     {type:'moveCard',target:'selected',destination:'removed'},
     {type:'setTurnProtection',player:'opponent',protection:{type:'handUseColorsOnly',colors:['yellow'],requireOnly:true}}
    ]}
   ]}
  ]}
 ]);
}
fs.writeFileSync(cardsPath,JSON.stringify(cards,null,2)+'\n');
const importPath=path.join(root,'tools/import-ready/BSC49/BSC49-091-102.json');
if(fs.existsSync(importPath)){
 const importCards=JSON.parse(fs.readFileSync(importPath,'utf8'));
 const src=cards.find(c=>c.id==='BSC49-099'); const dst=importCards.find(c=>c.id==='BSC49-099');
 if(dst){dst.abilities=src.abilities;dst.effects=[];}
 fs.writeFileSync(importPath,JSON.stringify(importCards,null,2)+'\n');
}
console.log('[batch29] patched BSC49 Wave 14 Wig Bind LT effect-text locks + optional Trash banish hand-color restriction.');
