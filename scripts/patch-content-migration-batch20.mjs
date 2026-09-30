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
function advent(c,{id,color,minCost}){
  putAbility(c,{id,schemaVersion:2,trigger:hand('magicFlash','self'),conditions:[{type:'phase',value:'attack'}],actions:[{type:'performAdvent',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],colors:[color],minimumCost:minCost}}]});
}
function combineCondition(c,id,selector){putAbility(c,{id,schemaVersion:2,type:'summonCondition',combineCondition:selector,trigger:source('continuous'),actions:[{type:'addModifier',property:'combineCondition',operation:'set',value:selector,selector:'source',duration:'whileSourceExists'}]});}

// BSC49-008 — reusable Advent + symbol-count destruction.
{
 const c=card('BSC49-008');
 advent(c,{id:'bsc49-008-advent-auto40',color:'red',minCost:4});
 putAbility(c,{id:'bsc49-008-advented-auto40',schemaVersion:2,trigger:source('whenAdvented'),levels:[1,2,3],actions:[{type:'selectMultipleTargets',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],maximumSymbols:1},maxTargets:2,asManyAsPossible:true,allowZero:true,onSelect:{type:'destroy'}}]});
 putAbility(c,{id:'bsc49-008-braved-attack-auto40',schemaVersion:2,trigger:source('whenAttacks'),levels:[2,3],requiresCombined:true,actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],minimumSymbols:2},allowZero:true,onSelect:{type:'destroy'},afterSelect:[{type:'draw',count:2}]}]});
}

// BSC49-027 — Advent + Brave swarm from hand/Open Area + attack exhaust scaling.
{
 const c=card('BSC49-027');
 advent(c,{id:'bsc49-027-advent-auto40',color:'green',minCost:4});
 const swarm=[{type:'selectMultipleTargets',selector:{owner:'self',zones:['hand','openArea'],cardTypes:['brave']},allowZero:true,maxTargets:99,onSelect:{type:'specialSummonSelected'},afterSelect:[{type:'addCoreFromVoid',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],braved:true,all:true},count:1}]}];
 putAbility(c,{id:'bsc49-027-summon-auto40',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2,3],actions:swarm});
 putAbility(c,{id:'bsc49-027-advented-auto40',schemaVersion:2,trigger:source('whenAdvented'),levels:[1,2,3],actions:swarm});
 putAbility(c,{id:'bsc49-027-braved-attack-auto40',schemaVersion:2,trigger:source('whenAttacks'),levels:[2,3],requiresCombined:true,actions:[{type:'selectMultipleTargets',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit']},allowZero:true,targetCountFrom:{selector:{owner:'self',zones:['field'],cardTypes:['brave'],includeCombined:true}},onSelect:{type:'exhaust'}}]});
}

// BSC49-040 — Advent + reveal-until special summon + draw.
{
 const c=card('BSC49-040');
 advent(c,{id:'bsc49-040-advent-auto40',color:'yellow',minCost:3});
 putAbility(c,{id:'bsc49-040-destroyed-reveal-auto40',schemaVersion:2,trigger:source('whenDestroyed'),levels:[1,2],actions:[{type:'chooseYesNo',yesActions:[{type:'revealUntilAndSummon',maximum:6,matchSelector:{cardTypes:['spirit'],minimumCost:6,maximumCost:8}}]}]});
 putAbility(c,{id:'bsc49-040-destroyed-draw-auto40',schemaVersion:2,trigger:source('whenDestroyed'),levels:[2],actions:[{type:'draw',count:3}]});
}

// BSC49-049 — remaining Accel/Open Area interaction + attack-step level/symbol modifiers.
{
 const c=card('BSC49-049');
 putAbility(c,{id:'bsc49-049-accel-auto40',schemaVersion:2,trigger:hand('magicFlash','self'),actions:[{type:'payAccelCost',cost:4,reduction:['blue','blue','all'],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],maximumCost:5},allowZero:false,onSelect:{type:'destroy'}},{type:'moveSourceToOpenArea'}]}]});
 putAbility(c,{id:'bsc49-049-attack-step-auto40',schemaVersion:2,trigger:source('attackStep','any'),levels:[1,2],actions:[{type:'forceLevel',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],minimumCost:6,all:true},maxLevel:true,duration:'turn'}]});
 putAbility(c,{id:'bsc49-049-symbol-auto40',schemaVersion:2,trigger:source('continuous'),levels:[2],conditions:[{type:'phase',value:'attack'}],actions:[{type:'addModifier',property:'symbols',operation:'add',value:['blue'],selector:{owner:'self',zones:['field'],cardTypes:['spirit'],families:['Divine Star','Fusion Beast']},duration:'whileSourceExists'}]});
}

// BSC49-056 — Brave summon draw + simple combine attack destruction.
{
 const c=card('BSC49-056');
 putAbility(c,{id:'bsc49-056-summon-auto40',schemaVersion:2,trigger:source('whenSummoned'),levels:[1],actions:[{type:'chooseYesNo',yesActions:[{type:'draw',count:1}]}]});
 combineCondition(c,'bsc49-056-combine-auto40',{minimumCost:0,maximumCost:4,cardTypes:['spirit']});
 putAbility(c,{id:'bsc49-056-combined-attack-auto40',schemaVersion:2,trigger:source('whenAttacks'),requiresCombined:true,actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],exhausted:true},allowZero:true,onSelect:{type:'destroy'}}]});
}

// BSC49-058 — Brave summon recovery + True Curse presentation.
{
 const c=card('BSC49-058');
 putAbility(c,{id:'bsc49-058-summon-auto40',schemaVersion:2,trigger:source('whenSummoned'),levels:[1],actions:[{type:'selectTarget',selector:{owner:'self',zones:['trash'],cardTypes:['spirit'],families:['Astral Soul','Divine Star','Galaxian']},allowZero:true,onSelect:{type:'returnToHand'}}]});
 combineCondition(c,'bsc49-058-combine-auto40',{cardTypes:['spirit'],families:['Concluser','Astral Soul','Divine Star','Galaxian']});
 putAbility(c,{id:'bsc49-058-true-curse-auto40',schemaVersion:2,trigger:source('continuous'),requiresCombined:true,actions:[{type:'addModifier',property:'trueCurse',operation:'set',value:1,selector:'combinedHost',duration:'whileSourceExists'}]});
}

// BSC49-066 — Brave summon bounce + opponent-attack refresh/core gain.
{
 const c=card('BSC49-066');
 putAbility(c,{id:'bsc49-066-summon-auto40',schemaVersion:2,trigger:source('whenSummoned'),levels:[1],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit']},allowZero:true,onSelect:{type:'returnToHand'}}]});
 combineCondition(c,'bsc49-066-combine-auto40',{minimumCost:0,maximumCost:4,cardTypes:['spirit']});
 putAbility(c,{id:'bsc49-066-opp-attack-auto40',schemaVersion:2,trigger:field('whenAttacks','opponent'),requiresCombined:true,actions:[{type:'chooseYesNo',yesActions:[{type:'refresh',target:'combinedHost'},{type:'addCoreFromVoid',target:'combinedHost',count:1}]}]});
}

// BSC49-067 — Brave summon unblockable aura + Heavy Armor.
{
 const c=card('BSC49-067');
 putAbility(c,{id:'bsc49-067-summon-auto40',schemaVersion:2,trigger:source('whenSummoned'),levels:[1],actions:[{type:'addModifier',property:'cannotBeBlocked',operation:'set',value:1,selector:{owner:'self',zones:['field'],cardTypes:['spirit'],braved:true},duration:'turn'}]});
 combineCondition(c,'bsc49-067-combine-auto40',{cardTypes:['spirit'],families:['Devotee','Concluser','Astral Soul','Divine Star','Galaxian']});
 putAbility(c,{id:'bsc49-067-heavy-armor-auto40',schemaVersion:2,trigger:source('continuous'),requiresCombined:true,actions:[{type:'addModifier',property:'effectImmunityColors',operation:'add',value:['purple','yellow'],selector:'combinedHost',duration:'whileSourceExists'}]});
}

// BSC49-068 — field protection + combined Phantom Armor presentation.
{
 const c=card('BSC49-068');
 putAbility(c,{id:'bsc49-068-protection-auto40',schemaVersion:2,trigger:source('continuous'),levels:[1],actions:[{type:'addModifier',property:'effectDestructionImmune',operation:'set',value:1,selector:{owner:'self',zones:['field'],cardTypes:['spirit','brave']},duration:'whileSourceExists'}]});
 combineCondition(c,'bsc49-068-combine-auto40',{minimumCost:3,cardTypes:['spirit']});
 putAbility(c,{id:'bsc49-068-phantom-auto40',schemaVersion:2,trigger:source('continuous'),requiresCombined:true,actions:[{type:'addModifier',property:'phantomArmorColors',operation:'add',value:['red','blue'],selector:'combinedHost',duration:'whileSourceExists'}]});
}

// BSC49-073 — Brave summon hand filtering + draw-trigger suppression presentation.
{
 const c=card('BSC49-073');
 putAbility(c,{id:'bsc49-073-summon-auto40',schemaVersion:2,trigger:source('whenSummoned'),levels:[1],actions:[{type:'chooseYesNo',yesActions:[{type:'draw',count:3},{type:'discard',player:'self',count:2}]}]});
 combineCondition(c,'bsc49-073-combine-auto40',{cardTypes:['spirit'],families:['Concluser','Astral Soul','Divine Star','Galaxian']});
 putAbility(c,{id:'bsc49-073-suppress-auto40',schemaVersion:2,trigger:source('continuous'),requiresCombined:true,actions:[{type:'addModifier',property:'suppressOpponentHandIncreaseReactionsToQualifiedDraw',operation:'set',value:1,selector:'combinedHost',duration:'whileSourceExists'}]});
}

fs.writeFileSync(cardsPath,JSON.stringify(cards,null,2)+'\n');
console.log('[batch20] patched BSC49 Wave 5 Advent + Brave/Open Area automation (10 cards).');
