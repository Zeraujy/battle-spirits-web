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

// BS13-011 — Curse + colorless while attacking.
{
  const c=card('BS13-011');
  putEffect(c,{id:'bs13-011-curse-auto30',type:'curse',timing:'whenAttacks',automationRef:'bs13-011-curse-trigger-auto30',title:{en:'Curse',ptBR:'Curse'},text:{en:'At the end of the battle, destroy the opposing Spirit that blocked this Spirit.',ptBR:'Ao final da batalha, destrua o Spirit oponente que bloqueou este Spirit.'}});
  putAbility(c,{id:'bs13-011-curse-trigger-auto30',schemaVersion:2,trigger:source('afterBattleResolution'),levels:[1,2],conditions:[{type:'battleState',blocked:true}],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],instanceIdFromContext:'blockerInstanceId'},allowZero:true,onSelect:{type:'destroy'}}]});
  putAbility(c,{id:'bs13-011-colorless-auto30',schemaVersion:2,trigger:source('whenAttacks'),levels:[2],actions:[{type:'addModifier',property:'colors',operation:'set',value:[],selector:'source',duration:'battle'}]});
}

// BS13-026 — activated Flash team BP buff + global three-card-per-turn effect discard cap.
{
  const c=card('BS13-026');
  putAbility(c,{id:'bs13-026-flash-auto30',schemaVersion:2,trigger:source('magicFlash'),levels:[1,2,3],conditions:[{type:'phase',value:'attack'}],actions:[{type:'exhaust',target:'source'},{type:'modifyBP',all:true,selector:{owner:'self',zones:['field'],cardTypes:['spirit'],families:['Galaxian','Astral Soul']},amount:3000,duration:'turn'}]});
  putAbility(c,{id:'bs13-026-deck-cap-self-auto30',schemaVersion:2,trigger:source('continuous'),levels:[1,2,3],actions:[{type:'addModifier',property:'maxDeckDiscardPerTurn',operation:'set',value:3,selector:{owner:'self'},duration:'whileSourceExists'}]});
  putAbility(c,{id:'bs13-026-deck-cap-opponent-auto30',schemaVersion:2,trigger:source('continuous'),levels:[1,2,3],actions:[{type:'addModifier',property:'maxDeckDiscardPerTurn',operation:'set',value:3,selector:{owner:'opponent'},duration:'whileSourceExists'}]});
}

// BS13-035 — attack lock for printed Costs 0/1/4 + extra Yellow reduction for Angel Spirits in hand.
{
  const c=card('BS13-035');
  for(const cost of [0,1,4]) putAbility(c,{id:`bs13-035-lock-${cost}-auto30`,schemaVersion:2,trigger:source('continuous'),levels:[1,2],actions:[{type:'addModifier',property:'cannotAttack',operation:'set',value:1,selector:{owner:'any',cardTypes:['spirit'],minimumCost:cost,maximumCost:cost},duration:'whileSourceExists'}]});
  putAbility(c,{id:'bs13-035-angel-reduction-auto30',schemaVersion:2,trigger:source('continuous'),levels:[2],actions:[{type:'addModifier',property:'summonReductionSymbols',operation:'add',value:['yellow'],selector:{owner:'self',cardTypes:['spirit'],families:['Angel']},duration:'whileSourceExists'}]});
}

// BS13-044 — pay one hand card, discard an opposing Magic; lock opponent Trash -> hand recovery.
{
  const c=card('BS13-044');
  putAbility(c,{id:'bs13-044-summon-auto30',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],actions:[{type:'selectTarget',selector:{owner:'self',zones:['hand']},allowZero:true,onSelect:{type:'discard'},afterSelect:[{type:'selectTarget',chooser:'self',selector:{owner:'opponent',zones:['hand'],cardTypes:['magic']},allowZero:true,onSelect:{type:'discard'}}]}]});
  putAbility(c,{id:'bs13-044-trash-lock-auto30',schemaVersion:2,trigger:source('continuous'),levels:[2],actions:[{type:'addModifier',property:'trashToHandBlocked',operation:'set',value:1,selector:{owner:'opponent'},duration:'whileSourceExists'}]});
}

// BS13-045 — Nexus trade + Ancient Battleship-scaled deck discard on Fighting Spirit battles.
{
  const c=card('BS13-045');
  putAbility(c,{id:'bs13-045-summon-auto30',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],actions:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['nexus']},allowZero:true,onSelect:{type:'destroy'},afterSelect:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['nexus']},allowZero:true,onSelect:{type:'destroy'}}]}]});
  putAbility(c,{id:'bs13-045-battle-auto30',schemaVersion:2,trigger:field('whenBattles','self'),levels:[2],conditions:[{type:'eventSourceFamily',family:'Fighting Spirit'}],actions:[{type:'topDeckToTrash',player:'opponent',countFromSelector:{owner:'self',zones:['field'],cardTypes:['nexus'],nameIncludes:'Ancient Battleship'},countMultiplier:2,maxCount:8}]});
}

// BS13-055 — top-deck an opposing Nexus; combined Heavy Armor Green/White/Yellow.
{
  const c=card('BS13-055');
  putAbility(c,{id:'bs13-055-summon-auto30',schemaVersion:2,trigger:source('whenSummoned'),levels:[1],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['nexus']},allowZero:true,onSelect:{type:'returnToTopDeck'}}]});
  putAbility(c,{id:'bs13-055-heavy-armor-auto30',schemaVersion:2,trigger:source('continuous'),levels:[1],requiresCombined:true,actions:[{type:'addModifier',property:'effectImmunityColors',operation:'add',value:['green','white','yellow'],selector:{combinedWithSource:true,includeCombined:true},duration:'whileSourceExists'}]});
}

// BS13-058 — once per turn mill five to heal one Life and make LV1/LV2 opposing Spirits unable to block this battle.
{
  const c=card('BS13-058');
  putAbility(c,{id:'bs13-058-braved-attack-auto30',schemaVersion:2,trigger:source('whenAttacks'),requiresCombined:true,actions:[{type:'oncePerTurn',key:'bs13-058-attack',actions:[{type:'topDeckToTrash',player:'self',count:5},{type:'healLife',player:'self',count:1},{type:'addModifier',property:'cannotBlock',operation:'set',value:1,selector:{owner:'opponent',cardTypes:['spirit'],maximumLevel:2},duration:'battle'}]}]});
}

// BS13-061 — low-BP attackers self-destruct; Terra Dragon + Dragonfolk attackers scale from Life.
{
  const c=card('BS13-061');
  putAbility(c,{id:'bs13-061-low-bp-auto30',schemaVersion:2,trigger:field('whenAttacks','any'),levels:[1,2],conditions:[{type:'eventSourceCardType',cardType:'spirit'},{type:'eventSourceBP',atMost:4000}],actions:[{type:'destroy',target:'effectSource'}]});
  putAbility(c,{id:'bs13-061-life-bp-auto30',schemaVersion:2,trigger:field('whenAttacks','self'),levels:[2],conditions:[{type:'eventSourceFamily',family:'Terra Dragon'},{type:'eventSourceFamily',family:'Dragonfolk'}],actions:[{type:'modifyBP',target:'effectSource',amountPerPlayerLife:1000,lifePlayer:'self',duration:'battle'}]});
}

// BS13-062 — Astral Deity hand cost override + once-per-turn activated Flash discard/buff.
{
  const c=card('BS13-062');
  putAbility(c,{id:'bs13-062-cost-auto30',schemaVersion:2,trigger:source('continuous'),levels:[1,2],actions:[{type:'addModifier',property:'printedCostOverride',operation:'set',value:5,selector:{owner:'self',cardTypes:['spirit'],families:['Astral Deity']},duration:'whileSourceExists'}]});
  putAbility(c,{id:'bs13-062-flash-auto30',schemaVersion:2,trigger:source('magicFlash'),levels:[2],conditions:[{type:'phase',value:'attack'}],actions:[{type:'oncePerTurn',key:'bs13-062-flash',actions:[{type:'selectTarget',selector:{owner:'self',zones:['hand'],cardTypes:['spirit'],families:['Astral Deity','Star Deity']},allowZero:true,onSelect:{type:'discard'},afterSelect:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit']},allowZero:false,onSelect:{type:'modifyBP',amount:6000,duration:'battle'},afterSelect:[{type:'addModifier',property:'symbols',operation:'add',value:['red'],selector:{selectedTarget:true},duration:'battle'}]}]}]}]});
}

// BS13-074 — reveal four, free summon one Astral Deity, trash the rest; Flash +3000 BP.
{
  const c=card('BS13-074');
  putAbility(c,{id:'bs13-074-main-auto30',schemaVersion:2,trigger:source('magicMain'),actions:[{type:'revealTop',player:'self',count:4},{type:'selectTarget',selector:{owner:'self',zones:['revealed'],cardTypes:['spirit'],families:['Astral Deity']},allowZero:true,onSelect:{type:'moveCard',destination:'hand'},afterSelect:[{type:'specialSummonFromHand',target:'selected',free:true}]},{type:'moveCard',all:true,selector:{owner:'self',zones:['revealed']},destination:'trash'}]});
  putAbility(c,{id:'bs13-074-flash-auto30',schemaVersion:2,trigger:source('magicFlash'),actions:[{type:'selectTarget',selector:{owner:'any',zones:['field'],cardTypes:['spirit']},allowZero:false,onSelect:{type:'modifyBP',amount:3000,duration:'turn'}}]});
}

fs.writeFileSync(cardsPath, JSON.stringify(cards,null,2)+'\n');
console.log('[batch10] patched BS13 Wave 2 automation (10 cards).');
