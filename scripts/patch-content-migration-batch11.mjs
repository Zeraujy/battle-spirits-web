import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cardsPath = path.join(root, 'src/data/cards.json');
const raw = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
const cards = Array.isArray(raw) ? raw : raw.cards;
function card(id){ const c=cards.find(x=>x.id===id&&x.set==='BS13'); if(!c) throw new Error(`Missing ${id}`); c.abilities??=[]; c.effects??=[]; return c; }
function putAbility(c,a){ const i=c.abilities.findIndex(x=>x.id===a.id); if(i>=0)c.abilities[i]=a; else c.abilities.push(a); }
function putEffect(c,e){ const i=c.effects.findIndex(x=>x.id===e.id); if(i>=0)c.effects[i]=e; else c.effects.push(e); }
const source=(event,eventPlayer='any')=>({event,scope:'source',eventPlayer});
const field=(event,eventPlayer='any')=>({event,scope:'controllerField',eventPlayer});
const trash=(event,eventPlayer='any')=>({event,scope:'controllerTrash',eventPlayer});

// BS13-014 — Immortality: Dark Snake + free Cost 7+ Trash summon without When Summoned.
{
  const c=card('BS13-014');
  putEffect(c,{id:'bs13-014-immortality-auto31',type:'immortality',timing:'whenDestroyed',title:{en:'Immortality: Dark Snake',ptBR:'Immortality: Dark Snake'},text:{en:'During either Attack Step, when one of your Dark Snake Spirits is destroyed, you may summon this card from your Trash.',ptBR:'Durante qualquer Attack Step, quando um dos seus Spirits Dark Snake for destruído, você pode invocar esta carta do Trash.'}});
  putAbility(c,{id:'bs13-014-immortality-trigger-auto31',schemaVersion:2,trigger:trash('whenDestroyed','self'),conditions:[{type:'phase',value:'attack'},{type:'eventSourceFamily',family:'Dark Snake'}],actions:[{type:'specialSummonSource',cause:'immortality'}]});
  putAbility(c,{id:'bs13-014-summon-auto31',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2,3],conditions:[{type:'specialSummonCause',value:'immortality'}],actions:[{type:'selectTarget',selector:{owner:'self',zones:['trash'],cardTypes:['spirit'],minimumCost:7},allowZero:true,onSelect:{type:'specialSummonFromTrash',free:true,suppressWhenSummoned:true,cause:'agravain'}}]});
}

// BS13-016 — summon observer, Dragonfolk exhaustion observer, Dragonaga mass recovery.
{
  const c=card('BS13-016');
  putAbility(c,{id:'bs13-016-dark-snake-draw-auto31',schemaVersion:2,trigger:field('whenSummoned','self'),levels:[1,2,3],conditions:[{type:'eventSourceFamily',family:'Dark Snake'}],actions:[{type:'draw',count:1}]});
  putAbility(c,{id:'bs13-016-dragonfolk-exhaust-auto31',schemaVersion:2,trigger:field('cardExhausted','self'),levels:[1,2,3],conditions:[{type:'phase',value:'attack'},{type:'eventSourceFamily',family:'Dragonfolk'}],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],minimumCores:1},allowZero:true,onSelect:{type:'removeCore',amount:1,destination:'reserve'}}]});
  putAbility(c,{id:'bs13-016-destroyed-auto31',schemaVersion:2,trigger:source('whenDestroyed'),levels:[2,3],actions:[{type:'returnAllTrashMatchingToHand',selector:{owner:'self',cardTypes:['spirit'],nameIncludes:'Dragonaga'}}]});
}

// BS13-034 — self-mill reaction + deck-discard lock + reveal Cost 2 Spirit.
{
  const c=card('BS13-034');
  putAbility(c,{id:'bs13-034-deck-discard-auto31',schemaVersion:2,trigger:trash('cardMoved','self'),conditions:[{type:'eventSourceIsSource'},{type:'eventMovedFromZone',zone:'deck'},{type:'eventMoveDestination',destination:'trash'},{type:'eventMovedByOpponent'}],actions:[{type:'specialSummonSource',cause:'deckDiscardReaction'},{type:'addModifier',property:'maxDeckDiscardPerTurn',operation:'set',value:0,selector:{owner:'self'},duration:'turn'}]});
  putAbility(c,{id:'bs13-034-summon-auto31',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],actions:[{type:'revealTopAndRoute',player:'self',count:1,matchSelector:{cardTypes:['spirit'],minimumCost:2,maximumCost:2},matchedDestination:'hand',otherwiseDestination:'topDeck'}]});
}

// BS13-043 — Cost 3-or-less Spirits must pay one Reserve Core to Trash to attack.
{
  const c=card('BS13-043');
  putAbility(c,{id:'bs13-043-attack-tax-auto31',schemaVersion:2,trigger:source('continuous'),levels:[1,2],actions:[{type:'addModifier',property:'attackReserveTrashCost',operation:'add',value:1,selector:{owner:'any',cardTypes:['spirit'],maximumCost:3},duration:'whileSourceExists'}]});
}

// BS13-050 — while combined, destroying 8000+ BP opposing Spirits drains one Life each.
{
  const c=card('BS13-050');
  putAbility(c,{id:'bs13-050-destruction-auto31',schemaVersion:2,trigger:field('whenDestroyed','opponent'),requiresCombined:true,conditions:[{type:'phase',value:'attack'},{type:'eventSourceBP',atLeast:8000},{type:'sourceCombined'}],actions:[{type:'moveLifeToReserve',player:'opponent',count:1}]});
}

// BS13-059 — deploy Purple/Green/Blue Nexuses from Trash; end Attack Step after a Cost <=4 battle while combined.
{
  const c=card('BS13-059');
  putAbility(c,{id:'bs13-059-summon-auto31',schemaVersion:2,trigger:source('whenSummoned'),levels:[1],actions:[{type:'deployFromTrash',all:true,selector:{owner:'self',zones:['trash'],cardTypes:['nexus'],colors:['purple','green','blue']}}]});
  putAbility(c,{id:'bs13-059-battle-auto31',schemaVersion:2,trigger:field('afterBattleResolution','any'),requiresCombined:true,conditions:[{type:'battleAttackerCost',atMost:4},{type:'battleAttackerIsCombinedHostOfSource'}],actions:[{type:'scheduleAttackStepEndAfterBattle'}]});
}

// BS13-082 — end the current battle without BP comparison, then refresh one Spirit.
{
  const c=card('BS13-082');
  putAbility(c,{id:'bs13-082-flash-auto31',schemaVersion:2,trigger:source('magicFlash'),actions:[{type:'setBattleRestriction',restriction:{skipBPComparison:true}},{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit']},allowZero:true,onSelect:{type:'refresh'}}]});
}

// BS13-083 — all own Spirits are treated at their highest printed LV this turn.
{
  const c=card('BS13-083');
  putAbility(c,{id:'bs13-083-flash-auto31',schemaVersion:2,trigger:source('magicFlash'),actions:[{type:'forceLevel',all:true,selector:{owner:'self',zones:['field'],cardTypes:['spirit']},maxLevel:true,duration:'turn'}]});
}

// BS13-X02 — sacrifice draw, BP-destruction preservation, blocker Core wipe to Void.
{
  const c=card('BS13-X02');
  putAbility(c,{id:'bs13-x02-summon-auto31',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2,3],actions:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],families:['Astral Soul'],excludeSource:true},allowZero:true,onSelect:{type:'destroy'},afterSelect:[{type:'draw',count:3}]}]});
  putAbility(c,{id:'bs13-x02-bp-save-auto31',schemaVersion:2,trigger:field('wouldBeDestroyed','self'),levels:[2,3],conditions:[{type:'phase',value:'attack'},{type:'activePlayer',player:'self'},{type:'eventCause',value:'bpComparison'},{any:[{type:'eventSourceFamily',family:'Galaxian'},{type:'eventSourceFamily',family:'Dark Snake'}]}],actions:[{type:'preventEvent'},{type:'refresh',target:'effectSource'}]});
  putAbility(c,{id:'bs13-x02-block-auto31',schemaVersion:2,trigger:source('whenBlocks'),levels:[3],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],battleOpponentOfSource:true},allowZero:true,onSelect:{type:'removeCore',allCores:true,destination:'void'}}]});
}

// BS13-X04 — Heavy Armor, refresh on allied exhaustion, extra White symbol while braved.
{
  const c=card('BS13-X04');
  putAbility(c,{id:'bs13-x04-heavy-armor-auto31',schemaVersion:2,trigger:source('continuous'),levels:[1,2,3],actions:[{type:'addModifier',property:'effectImmunityColors',operation:'add',value:['purple','green','white','yellow'],selector:'source',duration:'whileSourceExists'}]});
  putAbility(c,{id:'bs13-x04-refresh-auto31',schemaVersion:2,trigger:field('cardExhausted','self'),levels:[1,2,3],conditions:[{type:'eventSourceIsNotSource'},{any:[{type:'eventSourceFamily',family:'Galaxian'},{type:'eventSourceFamily',family:'Astral Soul'}]}],actions:[{type:'refresh',target:'source'}]});
  putAbility(c,{id:'bs13-x04-symbol-auto31',schemaVersion:2,trigger:source('continuous'),levels:[3],requiresCombined:true,actions:[{type:'addModifier',property:'symbols',operation:'add',value:['white'],selector:{owner:'self',cardTypes:['spirit'],families:['Galaxian','Astral Soul']},duration:'whileSourceExists'}]});
}

fs.writeFileSync(cardsPath, JSON.stringify(cards,null,2)+'\n');
console.log('[batch11] patched BS13 Wave 3 automation (10 cards).');
