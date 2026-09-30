import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const cardsPath=path.join(root,'src/data/cards.json');
const raw=JSON.parse(fs.readFileSync(cardsPath,'utf8'));
const cards=Array.isArray(raw)?raw:raw.cards;
function card(id){const c=cards.find(x=>x.id===id&&x.set==='BSC49');if(!c)throw new Error(`Missing ${id}`);c.abilities??=[];c.effects??=[];return c;}
function putAbility(c,a){const i=c.abilities.findIndex(x=>x.id===a.id);if(i>=0)c.abilities[i]=a;else c.abilities.push(a);}
const source=(event,eventPlayer='any')=>({event,scope:'source',eventPlayer});
const hand=(event,eventPlayer='any')=>({event,scope:'controllerHand',eventPlayer});
const field=(event,eventPlayer='any')=>({event,scope:'controllerField',eventPlayer});
function accel(c,{id,cost,reduction,actions}){
  putAbility(c,{id,schemaVersion:2,trigger:hand('magicFlash','self'),actions:[{type:'payAccelCost',cost,reduction,actions:[...actions,{type:'moveSourceToOpenArea'}]}]});
}
function dualColor(c,id,color){putAbility(c,{id,schemaVersion:2,trigger:source('continuous'),levels:[1,2,3],actions:[{type:'addModifier',property:'colors',operation:'add',value:[color],selector:'source',duration:'whileSourceExists'},{type:'addModifier',property:'symbols',operation:'add',value:[color],selector:'source',duration:'whileSourceExists'}]});}

// BSC49-001 — Accel Nexus route + Red/White identity.
{
 const c=card('BSC49-001');
 accel(c,{id:'bsc49-001-accel-auto39',cost:3,reduction:['red','white'],actions:[{type:'selectTarget',selector:{owner:'any',zones:['field'],cardTypes:['nexus']},allowZero:false,onSelect:{type:'chooseOption',options:[{id:'destroy',actions:[{type:'destroy',target:'selected'}]},{id:'bottom',actions:[{type:'returnToBottomDeck',target:'selected'}]}]}}]});
 dualColor(c,'bsc49-001-white-auto39','white');
}

// BSC49-002 — Accel BP pump + attack draw/pump + Super Confront presentation.
{
 const c=card('BSC49-002');
 accel(c,{id:'bsc49-002-accel-auto39',cost:1,reduction:[],actions:[{type:'selectTarget',selector:{owner:'any',zones:['field'],cardTypes:['spirit']},allowZero:false,onSelect:{type:'modifyBP',amount:3000,duration:'turn'}}]});
 putAbility(c,{id:'bsc49-002-attack-auto39',schemaVersion:2,trigger:source('whenAttacks'),levels:[1,2,3],actions:[{type:'draw',count:1},{type:'modifyBP',target:'source',amount:3000,duration:'battle'}]});
 putAbility(c,{id:'bsc49-002-super-confront-auto39',schemaVersion:2,trigger:source('whenAttacks'),levels:[2,3],actions:[{type:'addModifier',property:'mustBlockIfAble',operation:'set',value:1,selector:{owner:'opponent',zones:['field'],cardTypes:['spirit','ultimate']},duration:'battle'}]});
}

// BSC49-009 — Accel destroy-or-bottom route + White identity.
{
 const c=card('BSC49-009');
 accel(c,{id:'bsc49-009-accel-auto39',cost:4,reduction:['purple','white','all'],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],maximumCores:1},allowZero:false,onSelect:{type:'chooseOption',options:[{id:'destroy',actions:[{type:'destroy',target:'selected'}]},{id:'bottom',actions:[{type:'returnToBottomDeck',target:'selected'}]}]}}]});
 dualColor(c,'bsc49-009-white-auto39','white');
}

// BSC49-015 — Accel exchange, summon draw and destruction recovery.
{
 const c=card('BSC49-015');
 accel(c,{id:'bsc49-015-accel-auto39',cost:4,reduction:['purple','all'],actions:[{type:'selectTarget',chooser:'opponent',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit']},allowZero:false,onSelect:{type:'destroy'},afterSelect:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit']},allowZero:false,onSelect:{type:'destroy'}}]}]});
 putAbility(c,{id:'bsc49-015-summon-auto39',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2,3],actions:[{type:'chooseYesNo',yesActions:[{type:'draw',count:2}]}]});
 putAbility(c,{id:'bsc49-015-destroyed-auto39',schemaVersion:2,trigger:source('whenDestroyed'),levels:[2,3],actions:[{type:'selectTarget',selector:{owner:'self',zones:['trash'],colors:['purple'],families:['Devotee','Dark Snake']},allowZero:true,onSelect:{type:'returnToHand'}}]});
}

// BSC49-026 — Accel exhaust, End Step refresh and battle-end Brave return/refresh.
{
 const c=card('BSC49-026');
 accel(c,{id:'bsc49-026-accel-auto39',cost:3,reduction:['green','all'],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit']},allowZero:false,onSelect:{type:'exhaust'}}]});
 putAbility(c,{id:'bsc49-026-end-auto39',schemaVersion:2,trigger:source('endStep','self'),levels:[1,2,3],actions:[{type:'refreshAllMatching',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],colors:['green']}}]});
 putAbility(c,{id:'bsc49-026-battle-auto39',schemaVersion:2,trigger:field('afterBattleResolution','any'),levels:[2,3],conditions:[{type:'eventInvolvesControllerSpirit'}],actions:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['brave'],combined:false},allowZero:true,onSelect:{type:'returnToHand'},afterSelect:[{type:'refresh',target:'source'}]}]});
}

// BSC49-028 — Accel bounce-as-cost/draw + Red identity.
{
 const c=card('BSC49-028');
 accel(c,{id:'bsc49-028-accel-auto39',cost:4,reduction:['white','red','all'],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],braved:false},allowZero:false,onSelect:{type:'returnToHand'},afterSelect:[{type:'draw',count:1}]}]});
 dualColor(c,'bsc49-028-red-auto39','red');
}

// BSC49-032 — Accel attack-source Life shield + opponent Attack Step attack lock.
{
 const c=card('BSC49-032');
 accel(c,{id:'bsc49-032-accel-auto39',cost:2,reduction:['white'],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit']},allowZero:false,onSelect:{type:'setTurnProtection',player:'self',protection:{type:'blockSpiritAttackLifeDamageFromInstanceIds'}}}]});
 putAbility(c,{id:'bsc49-032-start-attack-auto39',schemaVersion:2,trigger:source('attackStep','opponent'),levels:[1,2],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit','ultimate'],braved:true},allowZero:true,onSelect:{type:'addModifier',property:'cannotAttack',operation:'set',value:1,selector:{selectedTarget:true},duration:'turn'}}]});
}

// BSC49-034 — Accel bottom-deck, effect immunity and attack observer exhaust.
{
 const c=card('BSC49-034');
 accel(c,{id:'bsc49-034-accel-auto39',cost:6,reduction:['white','white','all'],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit']},allowZero:false,onSelect:{type:'returnToBottomDeck'}}]});
 putAbility(c,{id:'bsc49-034-immunity-auto39',schemaVersion:2,trigger:source('continuous'),levels:[1,2,3],actions:[{type:'addModifier',property:'effectImmunityCardTypes',operation:'add',value:['spirit','magic'],selector:'source',duration:'whileSourceExists'}]});
 putAbility(c,{id:'bsc49-034-opp-attack-auto39',schemaVersion:2,trigger:field('whenAttacks','opponent'),levels:[2,3],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit']},allowZero:true,onSelect:{type:'exhaust'}}]});
}

// BSC49-044 — Accel cost 3/4 destruction with effect suppression + Red identity.
{
 const c=card('BSC49-044');
 accel(c,{id:'bsc49-044-accel-auto39',cost:3,reduction:['blue','red'],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],minimumCost:3,maximumCost:4},allowZero:false,onSelect:{type:'addModifier',property:'effectsDisabled',operation:'set',value:1,selector:{selectedTarget:true},duration:'event'},afterSelect:[{type:'destroy',target:'selected'}]}]});
 dualColor(c,'bsc49-044-red-auto39','red');
}

// BSC49-070 — Accel LV3 bottom-deck route + combined attack utility.
{
 const c=card('BSC49-070');
 accel(c,{id:'bsc49-070-accel-auto39',cost:4,reduction:['yellow','yellow','all'],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit','ultimate'],minimumLevel:3,maximumLevel:3},allowZero:false,onSelect:{type:'returnToBottomDeck'}}]});
 putAbility(c,{id:'bsc49-070-combined-flash-auto39',schemaVersion:2,trigger:source('magicFlash'),requiresCombined:true,levels:[1],conditions:[{type:'battleSourceRole',role:'attacker'}],actions:[{type:'oncePerTurn',key:'bsc49-070-combined-flash',actions:[{type:'topDeckToTrash',player:'self',count:5},{type:'healLife',player:'self',count:1},{type:'addModifier',property:'cannotBlock',operation:'set',value:1,selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],minimumLevel:2,maximumLevel:3},duration:'turn'}]}]});
}

fs.writeFileSync(cardsPath,JSON.stringify(cards,null,2)+'\n');
console.log('[batch19] patched BSC49 Wave 4 Accel/Open Area automation (10 cards).');
