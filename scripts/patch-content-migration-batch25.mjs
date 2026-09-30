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
const trash=(event,eventPlayer='any')=>({event,scope:'controllerTrash',eventPlayer});
const selfHandCycle=(owner)=>({type:'selectMultipleTargets',selector:{owner,zones:['hand'],excludeSource:true},maxTargets:99,asManyAsPossible:true,allowZero:true,onSelect:{type:'discard'},afterSelect:[{type:'draw',player:owner,count:4}]});

// BSC49-092 — Life Charge LT
{
 const c=card('BSC49-092');
 replaceAbilities(c,[
  {id:'bsc49-092-main-auto45',schemaVersion:2,trigger:source('magicMain'),actions:[{type:'oncePerTurn',key:'bsc49-092-same-name-main',actions:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],minimumCost:10},allowZero:false,onSelect:{type:'destroy'},afterSelect:[{type:'addCoreToTrashFromVoid',player:'self',count:5}]}]}]},
  {id:'bsc49-092-flash-auto45',schemaVersion:2,trigger:source('magicFlash'),actions:[{type:'oncePerTurn',key:'bsc49-092-same-name-flash',actions:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],minimumCost:3},allowZero:false,onSelect:{type:'destroy'},afterSelect:[{type:'addCoreToReserveFromVoid',player:'self',count:3}]}]}]}
 ]);
}

// BSC49-097 — Pegasus Flap LT
{
 const c=card('BSC49-097');
 replaceAbilities(c,[
  {id:'bsc49-097-trash-return-auto45',schemaVersion:2,trigger:trash('whenAttacks','self'),conditions:[{type:'eventSourceColor',color:'yellow'},{type:'eventSourceBraved'}],actions:[{type:'oncePerTurn',key:'bsc49-097-trash-return',actions:[{type:'chooseYesNo',yesActions:[{type:'returnToHand',target:'source'}]}]}]},
  {id:'bsc49-097-return-bp-auto45',schemaVersion:2,trigger:hand('cardMoved','self'),conditions:[{type:'eventMovedFromZone',zone:'trash'},{type:'eventMoveDestination',zone:'hand'},{type:'eventMovedByEffect'},{type:'eventMovedByColor',color:'yellow'}],actions:[{type:'oncePerTurn',key:'bsc49-097-return-bp',actions:[{type:'chooseYesNo',yesActions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit']},allowZero:true,onSelect:{type:'modifyBP',amount:-3000,duration:'turn'}}]}]}]},
  {id:'bsc49-097-flash-auto45',schemaVersion:2,trigger:source('magicFlash'),conditions:[{type:'phase',value:'attack'}],actions:[{type:'setBattleRestriction',restriction:{skipBPComparison:true}},{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit']},allowZero:true,onSelect:{type:'refresh'}}]}
 ]);
}

// BSC49-098 — Hand Typhoon LT
{
 const c=card('BSC49-098');
 const eligible={owner:'self',zones:['trash'],families:['Astral Soul','Galaxian'],familiesAll:['Devotee']};
 const selfOnly=[selfHandCycle('self')];
 const both=[
   {type:'selectMultipleTargets',selector:eligible,maxTargets:5,minTargets:5,allowZero:false,onConfirm:{type:'moveCard',destination:'removed'},afterConfirm:[selfHandCycle('self'),selfHandCycle('opponent')]}
 ];
 replaceAbilities(c,[
  {id:'bsc49-098-main-auto45',schemaVersion:2,trigger:source('magicMain'),actions:[{type:'oncePerTurn',key:'bsc49-098-same-name-main',actions:[{type:'conditional',condition:{type:'zoneCount',selector:eligible,atLeast:5},actions:[{type:'chooseYesNo',yesActions:both,noActions:selfOnly}],elseActions:selfOnly}]}]},
  {id:'bsc49-098-flash-auto45',schemaVersion:2,trigger:source('magicFlash'),actions:[{type:'selectTarget',selector:{owner:'any',zones:['field'],cardTypes:['spirit','ultimate']},allowZero:false,onSelect:{type:'modifyBP',amount:3000,duration:'turn'}}]}
 ]);
}

fs.writeFileSync(cardsPath,JSON.stringify(cards,null,2)+'\n');

const importPath=path.join(root,'tools/import-ready/BSC49/BSC49-091-102.json');
if(fs.existsSync(importPath)){
 const importCards=JSON.parse(fs.readFileSync(importPath,'utf8'));
 for(const id of ['BSC49-092','BSC49-097','BSC49-098']){
  const src=cards.find(c=>c.id===id); const dst=importCards.find(c=>c.id===id);
  if(dst){dst.abilities=src.abilities;dst.effects=[];}
 }
 fs.writeFileSync(importPath,JSON.stringify(importCards,null,2)+'\n');
}
console.log('[batch25] patched BSC49 Wave 10 advanced Magic foundation (3 cards).');
