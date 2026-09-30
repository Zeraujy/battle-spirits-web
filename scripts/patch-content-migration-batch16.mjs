import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const cardsPath=path.join(root,'src/data/cards.json');
const raw=JSON.parse(fs.readFileSync(cardsPath,'utf8'));
const cards=Array.isArray(raw)?raw:raw.cards;
function card(id){const c=cards.find(x=>x.id===id&&x.set==='BSC49');if(!c)throw new Error(`Missing ${id}`);c.abilities??=[];c.effects??=[];return c;}
function putAbility(c,a){const i=c.abilities.findIndex(x=>x.id===a.id);if(i>=0)c.abilities[i]=a;else c.abilities.push(a);}
function putEffect(c,e){const i=c.effects.findIndex(x=>x.id===e.id);if(i>=0)c.effects[i]=e;else c.effects.push(e);}
const source=(event,eventPlayer='any')=>({event,scope:'source',eventPlayer});
const field=(event,eventPlayer='any')=>({event,scope:'controllerField',eventPlayer});

// BSC49-019 — High Speed, +3 cost during Attack Step, once-per-turn refresh while Braved.
{
 const c=card('BSC49-019');
 putEffect(c,{id:'bsc49-019-highspeed-auto36',type:'highSpeed',timing:'flash',title:{en:'High Speed',ptBR:'High Speed'},text:{en:'This Spirit may be summoned from hand during Flash timing by paying its cost from the Reserve.',ptBR:'Este Spirit pode ser Invocado da mão durante o Flash Timing pagando seu custo com a Reserve.'}});
 putAbility(c,{id:'bsc49-019-cost-auto36',schemaVersion:2,trigger:source('continuous'),levels:[2,3],actions:[{type:'addModifier',property:'cost',operation:'add',value:3,selector:'source',duration:'whileConditionTrue',condition:{type:'phase',value:'attack'}}]});
 putAbility(c,{id:'bsc49-019-refresh-auto36',schemaVersion:2,trigger:source('whenAttacks'),levels:[3],requiresCombined:true,actions:[{type:'oncePerTurn',key:'bsc49-019-refresh',actions:[{type:'refresh',target:'source'}]}]});
}

// BSC49-020 — core gain on Summon/Destroyed and optional family placement.
{
 const c=card('BSC49-020');
 const actions=[{type:'addCoreToReserveFromVoid',player:'self',count:1},{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],families:['Astral Soul','Divine Star','Galaxian'],excludeSource:true},allowZero:true,onSelect:{type:'addCoreFromVoid',count:1}}];
 putAbility(c,{id:'bsc49-020-summon-auto36',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],actions});
 putAbility(c,{id:'bsc49-020-destroyed-auto36',schemaVersion:2,trigger:source('whenDestroyed'),levels:[1,2],actions});
}

// BSC49-022 — High Speed; on summon detach an opposing Brave then exhaust a Spirit.
{
 const c=card('BSC49-022');
 putEffect(c,{id:'bsc49-022-highspeed-auto36',type:'highSpeed',timing:'flash',title:{en:'High Speed',ptBR:'High Speed'},text:{en:'This Spirit may be summoned from hand during Flash timing by paying its cost from the Reserve.',ptBR:'Este Spirit pode ser Invocado da mão durante o Flash Timing pagando seu custo com a Reserve.'}});
 putAbility(c,{id:'bsc49-022-summon-auto36',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['brave'],combined:true,includeCombined:true},allowZero:true,onSelect:{type:'returnToHand'},afterSelect:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit']},allowZero:true,onSelect:{type:'exhaust'}}]}]});
}

// BSC49-024 — High Speed + core placement on Summon/Attack.
{
 const c=card('BSC49-024');
 putEffect(c,{id:'bsc49-024-highspeed-auto36',type:'highSpeed',timing:'flash',title:{en:'High Speed',ptBR:'High Speed'},text:{en:'This Spirit may be summoned from hand during Flash timing by paying its cost from the Reserve.',ptBR:'Este Spirit pode ser Invocado da mão durante o Flash Timing pagando seu custo com a Reserve.'}});
 const gain={type:'chooseOption',options:[{id:'reserve',actions:[{type:'addCoreToReserveFromVoid',player:'self',count:1}]},{id:'spirit',actions:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit']},allowZero:false,onSelect:{type:'addCoreFromVoid',count:1}}]}]};
 putAbility(c,{id:'bsc49-024-summon-auto36',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],actions:[gain]});
 putAbility(c,{id:'bsc49-024-attack-auto36',schemaVersion:2,trigger:source('whenAttacks'),levels:[1,2],actions:[gain]});
}

// BSC49-025 — destroyed core gain scales with current LV; opponent destruction doubles it.
{
 const c=card('BSC49-025');
 putAbility(c,{id:'bsc49-025-destroyed-auto36',schemaVersion:2,trigger:source('whenDestroyed'),levels:[1,2,3],actions:[{type:'addCoreToReserveFromVoid',player:'self',countFromSourceLevel:true}]});
 putAbility(c,{id:'bsc49-025-opponent-bonus-auto36',schemaVersion:2,trigger:source('whenDestroyed'),levels:[1,2,3],conditions:[{type:'eventDestroyedByOpponent'}],actions:[{type:'addCoreToReserveFromVoid',player:'self',countFromSourceLevel:true}]});
}

// BSC49-033 — secondary Red identity, exhausted blocking for Red Spirits, core gain on their battles.
{
 const c=card('BSC49-033');
 putAbility(c,{id:'bsc49-033-red-auto36',schemaVersion:2,trigger:source('continuous'),levels:[1,2,3],actions:[{type:'addModifier',property:'colors',operation:'add',value:['red'],selector:'source',duration:'whileSourceExists'},{type:'addModifier',property:'symbols',operation:'add',value:['red'],selector:'source',duration:'whileSourceExists'},{type:'addModifier',property:'allowExhaustedBlock',operation:'set',value:1,selector:{owner:'self',cardTypes:['spirit'],colors:['red']},duration:'whileSourceExists'}]});
 putAbility(c,{id:'bsc49-033-attack-core-auto36',schemaVersion:2,trigger:field('whenAttacks','self'),levels:[2,3],conditions:[{type:'eventSourceColor',color:'red'}],actions:[{type:'addCoreFromVoid',target:'source',count:1}]});
 putAbility(c,{id:'bsc49-033-block-core-auto36',schemaVersion:2,trigger:field('whenBlocks','self'),levels:[2,3],conditions:[{type:'eventSourceColor',color:'red'}],actions:[{type:'addCoreFromVoid',target:'source',count:1}]});
}

// BSC49-036 — reveal routing on Summon/Destroyed + BP per Brave controlled.
{
 const c=card('BSC49-036');
 const reveal={type:'revealTopAndRoute',player:'self',count:3,matchSelector:{colors:['white','yellow'],families:['Devotee','Concluser','Galaxian'],nameIncludesNot:'Pomeran'},matchedDestination:'hand',otherwiseDestination:'bottomDeck'};
 putAbility(c,{id:'bsc49-036-summon-auto36',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2,3],actions:[reveal]});
 putAbility(c,{id:'bsc49-036-destroyed-auto36',schemaVersion:2,trigger:source('whenDestroyed'),levels:[1,2,3],actions:[reveal]});
 const bp={type:'modifyBP',target:'source',amountPerMatching:3000,countSelector:{owner:'self',zones:['field'],cardTypes:['brave'],includeCombined:true},duration:'battle'};
 putAbility(c,{id:'bsc49-036-attack-auto36',schemaVersion:2,trigger:source('whenAttacks'),levels:[1,2,3],actions:[bp]});
 putAbility(c,{id:'bsc49-036-block-auto36',schemaVersion:2,trigger:source('whenBlocks'),levels:[1,2,3],actions:[bp]});
}

// BSC49-037 — Yellow destruction replacement + family draw/core riders.
{
 const c=card('BSC49-037');
 putAbility(c,{id:'bsc49-037-save-auto36',schemaVersion:2,trigger:field('wouldBeDestroyed','self'),levels:[1,2,3],conditions:[{type:'phase',value:'attack'},{type:'eventSourceColor',color:'yellow'}],actions:[{type:'moveLifeToReserve',player:'self',count:1},{type:'preventEvent'},{type:'exhaust',target:'effectSource'}]});
 putAbility(c,{id:'bsc49-037-draw-auto36',schemaVersion:2,trigger:field('whenDestroyed','self'),levels:[2,3],conditions:[{any:[{type:'eventSourceFamily',family:'Devotee'},{type:'eventSourceFamily',family:'Astral Soul'},{type:'eventSourceFamily',family:'Galaxian'}]}],actions:[{type:'draw',count:1}]});
 putAbility(c,{id:'bsc49-037-core-auto36',schemaVersion:2,trigger:field('whenDestroyed','self'),levels:[3],conditions:[{type:'eventSourceColor',color:'yellow'}],actions:[{type:'addCoreToReserveFromVoid',player:'self',count:1}]});
}

// BSC49-046 — summon destruction/core reward, Assault 1, Cost 6-or-less attack lock while a Brave is combined.
{
 const c=card('BSC49-046');
 putAbility(c,{id:'bsc49-046-summon-auto36',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],maximumCost:4},allowZero:true,onSelect:{type:'destroy'},afterSelect:[{type:'addCoreFromVoid',target:'source',count:1},{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['nexus']},allowZero:true,onSelect:{type:'addCoreFromVoid',count:1}}]}]});
 putAbility(c,{id:'bsc49-046-assault-auto36',schemaVersion:2,trigger:source('whenAttacks'),levels:[1,2],actions:[{type:'oncePerTurn',key:'bsc49-046-assault',actions:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['nexus'],refreshed:true},allowZero:true,onSelect:{type:'exhaust'},afterSelect:[{type:'refresh',target:'source'}]}]}]});
 putAbility(c,{id:'bsc49-046-lock-auto36',schemaVersion:2,trigger:source('continuous'),levels:[2],actions:[{type:'addModifier',property:'cannotAttack',operation:'set',value:1,selector:{owner:'opponent',cardTypes:['spirit'],maximumCost:6},duration:'whileConditionTrue',condition:{type:'fieldCount',player:'self',selector:{cardTypes:['spirit'],braved:true},atLeast:1}}]});
}

// BSC49-047 — summon destruction choice, global post-Magic Main Step ending, Assault 1.
{
 const c=card('BSC49-047');
 putAbility(c,{id:'bsc49-047-summon-auto36',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],actions:[{type:'chooseOption',options:[{id:'two-low',actions:[{type:'selectMultipleTargets',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],maximumCost:3},maxTargets:2,asManyAsPossible:true,allowZero:true,onConfirm:{type:'destroy'}}]},{id:'one-high',actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],minimumCost:6,maximumCost:7},allowZero:true,onSelect:{type:'destroy'}}]}]}]});
 putAbility(c,{id:'bsc49-047-magic-end-auto36',schemaVersion:2,trigger:field('magicResolved','any'),levels:[1,2],conditions:[{type:'phase',value:'main'}],actions:[{type:'endCurrentStep'}]});
 putAbility(c,{id:'bsc49-047-assault-auto36',schemaVersion:2,trigger:source('whenAttacks'),levels:[2],actions:[{type:'oncePerTurn',key:'bsc49-047-assault',actions:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['nexus'],refreshed:true},allowZero:true,onSelect:{type:'exhaust'},afterSelect:[{type:'refresh',target:'source'}]}]}]});
}

fs.writeFileSync(cardsPath,JSON.stringify(cards,null,2)+'\n');
console.log('[batch16] patched BSC49 Wave 1 automation (10 cards).');
