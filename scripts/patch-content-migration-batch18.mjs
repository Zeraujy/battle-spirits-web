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
const trash=(event,eventPlayer='any')=>({event,scope:'controllerTrash',eventPlayer});
const hand=(event,eventPlayer='any')=>({event,scope:'controllerHand',eventPlayer});

// BSC49-004 — Life Burst, equal-BP destruction, attack/block battle boost.
{
 const c=card('BSC49-004');
 putAbility(c,{id:'bsc49-004-burst-auto38',schemaVersion:2,trigger:hand('lifeDecreased','self'),actions:[{type:'draw',count:1},{type:'specialSummonSource',free:true,cause:'burst'}]});
 putAbility(c,{id:'bsc49-004-attack-kill-auto38',schemaVersion:2,trigger:source('whenAttacks'),levels:[1,2,3],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],minimumBPFromSource:true,maximumBPFromSource:true},allowZero:true,onSelect:{type:'destroy'}}]});
 const boost=[{type:'modifyBP',target:'source',amount:1000,duration:'battle'}];
 putAbility(c,{id:'bsc49-004-attack-boost-auto38',schemaVersion:2,trigger:source('whenAttacks'),levels:[1,2,3],actions:boost});
 putAbility(c,{id:'bsc49-004-block-boost-auto38',schemaVersion:2,trigger:source('whenBlocks'),levels:[1,2,3],actions:boost});
}

// BSC49-013 — Immortality 2/4/6. Engine-native special summons are already cost-free.
{
 const c=card('BSC49-013');
 putEffect(c,{id:'bsc49-013-immortality-auto38',type:'immortality',timing:'whenDestroyed',title:{en:'Immortality: 2/4/6',ptBR:'Immortality: 2/4/6'},text:{en:'During either Attack Step, when one of your Cost 2, 4, or 6 Spirits is destroyed, you may summon this card from your Trash.',ptBR:'Durante qualquer Attack Step, quando 1 dos seus Spirits de custo 2, 4 ou 6 for destruído, você pode invocar esta carta do Trash.'}});
 putAbility(c,{id:'bsc49-013-immortality-trigger-auto38',schemaVersion:2,trigger:trash('whenDestroyed','self'),conditions:[{type:'phase',value:'attack'},{any:[{type:'eventSourceCost',equals:2},{type:'eventSourceCost',equals:4},{type:'eventSourceCost',equals:6}]}],actions:[{type:'specialSummonSource',cause:'immortality'}]});
 putAbility(c,{id:'bsc49-013-free-immortality-auto38',schemaVersion:2,trigger:field('whenSummoned','self'),levels:[1,2],conditions:[{type:'specialSummonCause',value:'immortality'}],actions:[{type:'addModifier',property:'immortalitySummonsCostFree',operation:'set',value:1,selector:{owner:'self'},duration:'event'}]});
}

// BSC49-023 — two reusable Flash abilities during either Attack Step.
{
 const c=card('BSC49-023');
 putAbility(c,{id:'bsc49-023-speed-return-auto38',schemaVersion:2,trigger:source('magicFlash'),levels:[1,2],conditions:[{type:'phase',value:'attack'}],actions:[{type:'oncePerTurn',key:'bsc49-023-speed-return',actions:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],keywords:['highspeed','sonicspeed'],excludeSource:true},allowZero:true,onSelect:{type:'returnToHand'},afterSelect:[{type:'refresh',target:'source'}]}]}]});
 putAbility(c,{id:'bsc49-023-brave-combine-auto38',schemaVersion:2,trigger:source('magicFlash'),levels:[2],conditions:[{type:'phase',value:'attack'}],actions:[{type:'oncePerTurn',key:'bsc49-023-brave-combine',actions:[{type:'specialSummonBraveCombinedFromHand',braveSelector:{owner:'self',zones:['hand'],cardTypes:['brave']},hostSelector:{owner:'self',zones:['field'],cardTypes:['spirit']},refreshHost:true}]}]});
}

// BSC49-031 — hand replacement shield, chosen-attacker shield, global opposing-effect shield.
{
 const c=card('BSC49-031');
 putAbility(c,{id:'bsc49-031-hand-shield-auto38',schemaVersion:2,trigger:hand('wouldLoseLife','self'),actions:[{type:'specialSummonSource',free:true,cause:'life-shield'},{type:'preventEvent'}]});
 putAbility(c,{id:'bsc49-031-attack-step-shield-auto38',schemaVersion:2,trigger:source('attackStep','opponent'),levels:[1,2],actions:[{type:'chooseYesNo',yesActions:[{type:'returnToHand',target:'source'},{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit']},allowZero:false,onSelect:{type:'setTurnProtection',player:'self',protection:{type:'blockSpiritAttackLifeDamageFromInstanceIds'}}}]}]});
 putAbility(c,{id:'bsc49-031-effect-shield-auto38',schemaVersion:2,trigger:source('continuous'),levels:[2],actions:[{type:'addModifier',property:'opponentEffectLifeDamageBlocked',operation:'set',value:1,selector:{owner:'self'},duration:'whileSourceExists'}]});
}

// BSC49-045 — summon hand disruption + Trash lockdown.
{
 const c=card('BSC49-045');
 putAbility(c,{id:'bsc49-045-summon-auto38',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],actions:[{type:'selectTarget',selector:{owner:'self',zones:['hand']},allowZero:true,onSelect:{type:'discard'},afterSelect:[{type:'selectTarget',chooser:'self',selector:{owner:'opponent',zones:['hand'],cardTypes:['magic']},allowZero:true,onSelect:{type:'discard'}}]}]});
 putAbility(c,{id:'bsc49-045-trash-immunity-auto38',schemaVersion:2,trigger:source('continuous'),levels:[2],actions:[{type:'addModifier',property:'effectImmunityAll',operation:'set',value:1,selector:{owner:'any',zones:['trash']},duration:'whileSourceExists'},{type:'addModifier',property:'effectsDisabled',operation:'set',value:1,selector:{owner:'any',zones:['trash']},duration:'whileSourceExists'}]});
}


// BSC49-050 — Ancient Battleship wipe and temporary Nexus Spirit-form conversion.
{
 const c=card('BSC49-050');
 const wipe=[{type:'destroyAllMatching',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit','nexus']}}];
 const cond=[{type:'fieldCount',player:'self',selector:{owner:'self',zones:['field'],cardTypes:['nexus'],nameIncludes:'Ancient Battleship'},atLeast:4}];
 putAbility(c,{id:'bsc49-050-summon-wipe-auto38',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],conditions:cond,actions:wipe});
 putAbility(c,{id:'bsc49-050-attack-wipe-auto38',schemaVersion:2,trigger:source('whenAttacks'),levels:[1,2],conditions:cond,actions:wipe});
 putAbility(c,{id:'bsc49-050-attack-form-auto38',schemaVersion:2,trigger:source('whenAttacks'),levels:[2],actions:[{type:'selectMultipleTargets',selector:{owner:'self',zones:['field'],cardTypes:['nexus']},maxTargets:4,asManyAsPossible:true,allowZero:true,onConfirm:[{type:'addCoreFromVoid',count:1},{type:'addModifier',property:'ancientBattleshipSpiritForm',operation:'set',value:1,selector:{selectedTarget:true},duration:'thisTurn'},{type:'addModifier',property:'effectsDisabled',operation:'set',value:1,selector:{selectedTarget:true},duration:'thisTurn'}]}]});
}

// BSC49-051 — Brave may host another Brave and relay Brave attack effects.
{
 const c=card('BSC49-051');
 putAbility(c,{id:'bsc49-051-host-brave-auto38',schemaVersion:2,trigger:source('continuous'),levels:[1],actions:[{type:'addModifier',property:'canHostBrave',operation:'set',value:1,selector:'source',duration:'whileSourceExists'}]});
 putAbility(c,{id:'bsc49-051-copy-brave-attack-auto38',schemaVersion:2,trigger:source('continuous'),actions:[{type:'addModifier',property:'copyBraveAttackEffect',operation:'set',value:1,selector:{combinedHostOfSource:true},duration:'whileSourceExists'}]});
}

// BSC49-059 — Trash recovery observer + Brave summon exchange.
{
 const c=card('BSC49-059');
 putAbility(c,{id:'bsc49-059-trash-return-auto38',schemaVersion:2,trigger:trash('cardMoved','self'),conditions:[{type:'eventMovedFromZone',zone:'field'},{type:'eventMovedByOpponent'},{type:'eventMovedCardFamily',family:'Dark Snake'}],actions:[{type:'oncePerTurn',key:'bsc49-059-trash-return',actions:[{type:'selectTarget',selector:{owner:'self',zones:['hand']},allowZero:true,onSelect:{type:'discard'},afterSelect:[{type:'returnToHand',target:'source'}]}]}]});
 putAbility(c,{id:'bsc49-059-summon-auto38',schemaVersion:2,trigger:source('whenSummoned'),levels:[1],actions:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit']},allowZero:true,onSelect:{type:'destroy'},afterSelect:[{type:'selectTarget',chooser:'opponent',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit']},allowZero:false,onSelect:{type:'destroy'}}]}]});
}

// BSC49-076 — deploy choice + Purple attack observer core drain.
{
 const c=card('BSC49-076');
 putAbility(c,{id:'bsc49-076-deploy-auto38',schemaVersion:2,trigger:source('whenDeployed'),levels:[1,2],actions:[{type:'chooseOption',options:[{id:'mill2',actions:[{type:'topDeckToTrash',player:'self',count:2}]},{id:'draw1',actions:[{type:'draw',count:1}]}]}]});
 putAbility(c,{id:'bsc49-076-attack-observer-auto38',schemaVersion:2,trigger:field('whenAttacks','self'),levels:[2],conditions:[{type:'activePlayer',player:'self'},{type:'eventSourceColor',color:'purple'}],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],minimumCores:1},allowZero:true,onSelect:{type:'removeCore',amount:1,destination:'reserve'}}]});
}

// BSC49-101 — Main mill/deploy and Flash summon + BP pump.
{
 const c=card('BSC49-101');
 putAbility(c,{id:'bsc49-101-main-auto38',schemaVersion:2,trigger:source('magicMain'),actions:[{type:'topDeckToTrash',player:'self',count:4},{type:'deployFromTrash',all:true,selector:{owner:'self',zones:['trash'],cardTypes:['nexus'],nameIncludes:'Ancient Battleship'}}]});
 putAbility(c,{id:'bsc49-101-flash-auto38',schemaVersion:2,trigger:source('magicFlash'),actions:[{type:'selectTarget',selector:{owner:'self',zones:['hand'],cardTypes:['spirit'],nameIncludes:'AncientBattleship Argo-Golem'},allowZero:true,onSelect:{type:'specialSummonFromHand',free:true,cause:'magic'}},{type:'selectTarget',selector:{owner:'any',zones:['field'],cardTypes:['spirit','ultimate']},allowZero:false,onSelect:{type:'modifyBP',amount:5000,duration:'turn'}}]});
}

// BSC49-004-like protection support: LT Moonshouuo blocks all opposing effect Life damage.
// This generic modifier is interpreted in actionResolver below.

fs.writeFileSync(cardsPath,JSON.stringify(cards,null,2)+'\n');
console.log('[batch18] patched BSC49 Wave 3 automation (9 cards plus structural variants).');
