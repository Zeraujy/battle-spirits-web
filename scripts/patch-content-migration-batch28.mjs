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

// BSC49-100 — Orion Power LT
{
 const c=card('BSC49-100');
 replaceAbilities(c,[
  {id:'bsc49-100-discard-auto48',schemaVersion:2,trigger:trash('cardMoved','self'),conditions:[
    {type:'eventSourceIsSource'},
    {type:'eventMovedFromZone',zone:'hand'},
    {type:'eventMoveDestination',zone:'trash'},
    {type:'eventMovedByColor',color:'blue'}
  ],actions:[{type:'chooseOption',options:[
    {id:'main',labelEN:'Activate Main',labelPT:'Ativar Main',actions:[{type:'dispatchSourceEvent',event:'magicMain'}]},
    {id:'flash',labelEN:'Activate Flash',labelPT:'Ativar Flash',actions:[{type:'dispatchSourceEvent',event:'magicFlash'}]}
  ]}]},
  {id:'bsc49-100-main-auto48',schemaVersion:2,trigger:source('magicMain'),actions:[{type:'oncePerTurn',key:'bsc49-100-same-name-main',actions:[
    {type:'addModifier',property:'opponentDeckDiscardOnLifeDamage',operation:'set',value:10,selector:{owner:'self',zones:['field'],cardTypes:['spirit'],families:['Astral Soul','Galaxian','Fighting Spirit']},duration:'thisTurn'}
  ]}]},
  {id:'bsc49-100-flash-auto48',schemaVersion:2,trigger:source('magicFlash'),actions:[
    {type:'selectTarget',selector:{owner:'any',zones:['field'],cardTypes:['spirit','ultimate']},allowZero:false,onSelect:{type:'modifyBP',amount:3000,duration:'turn'}}
  ]}
 ]);
}

fs.writeFileSync(cardsPath,JSON.stringify(cards,null,2)+'\n');
const importPath=path.join(root,'tools/import-ready/BSC49/BSC49-091-102.json');
if(fs.existsSync(importPath)){
 const importCards=JSON.parse(fs.readFileSync(importPath,'utf8'));
 for(const id of ['BSC49-100']){const src=cards.find(c=>c.id===id);const dst=importCards.find(c=>c.id===id);if(dst){dst.abilities=src.abilities;dst.effects=[];}}
 fs.writeFileSync(importPath,JSON.stringify(importCards,null,2)+'\n');
}
console.log('[batch28] patched BSC49 Wave 13 Orion Power LT discard activation + attack-Life deck discard observer.');
