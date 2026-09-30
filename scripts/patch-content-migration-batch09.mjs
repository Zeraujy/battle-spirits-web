import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cardsPath = path.join(root, 'src/data/cards.json');
const raw = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
const cards = Array.isArray(raw) ? raw : raw.cards;

function card(id) {
  const found = cards.find((c) => c.id === id && c.set === 'BS13');
  if (!found) throw new Error(`Missing BS13 runtime card ${id}`);
  found.abilities ??= [];
  found.effects ??= [];
  return found;
}
function putAbility(c, ability) {
  const i = c.abilities.findIndex((a) => a.id === ability.id);
  if (i >= 0) c.abilities[i] = ability;
  else c.abilities.push(ability);
}
function putEffect(c, effect) {
  const i = c.effects.findIndex((a) => a.id === effect.id);
  if (i >= 0) c.effects[i] = effect;
  else c.effects.push(effect);
}
const source = (event, eventPlayer = 'any') => ({ event, scope: 'source', eventPlayer });
const field = (event, eventPlayer = 'any') => ({ event, scope: 'controllerField', eventPlayer });

// BS13-006 — destroy low-BP attackers; gain a Red symbol while a Brave exists in Spirit form.
{
  const c = card('BS13-006');
  putAbility(c, {
    id: 'bs13-006-low-bp-attacker-auto29', schemaVersion: 2,
    trigger: field('whenAttacks', 'opponent'), levels: [1,2,3],
    conditions: [{ type: 'eventSourceCardType', cardType: 'spirit' }, { type: 'eventSourceBP', atMost: 4000 }],
    actions: [{ type: 'destroy', target: 'effectSource' }]
  });
  putAbility(c, {
    id: 'bs13-006-symbol-auto29', schemaVersion: 2,
    trigger: source('whenAttacks'), levels: [2,3],
    conditions: [{ type: 'controlsCardType', cardType: 'brave' }],
    actions: [{ type: 'addModifier', property: 'symbols', operation: 'add', value: ['red'], selector: 'source', duration: 'battle' }]
  });
}

// BS13-010 — when destroyed by the opponent, Special Summon up to two Cost 1-or-less Spirits from Trash.
{
  const c = card('BS13-010');
  putAbility(c, {
    id: 'bs13-010-destroyed-auto29', schemaVersion: 2,
    trigger: source('whenDestroyed'), levels: [2],
    conditions: [{ type: 'eventDestroyedByOpponent' }],
    actions: [{
      type: 'selectMultipleTargets',
      selector: { owner: 'self', zones: ['trash'], cardTypes: ['spirit'], maximumCost: 1 },
      maxTargets: 2, allowZero: true, asManyAsPossible: false,
      onConfirm: { type: 'specialSummonFromTrash', target: 'selected', allowedCardTypes: ['spirit'] }
    }]
  });
}

// BS13-013 — remove one Core from every opposing Cost 3-or-less Spirit.
{
  const c = card('BS13-013');
  putAbility(c, {
    id: 'bs13-013-summon-auto29', schemaVersion: 2,
    trigger: source('whenSummoned'), levels: [1,2,3],
    actions: [{ type: 'removeCore', all: true, selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'], maximumCost: 3, minimumCores: 1 }, amount: 1, destination: 'reserve' }]
  });
}

// BS13-017 — +1000 BP for each Imp family Spirit you control.
{
  const c = card('BS13-017');
  putAbility(c, {
    id: 'bs13-017-attack-auto29', schemaVersion: 2,
    trigger: source('whenAttacks'), levels: [2],
    actions: [{ type: 'modifyBP', target: 'source', duration: 'battle', amountPerMatching: 1000, countSelector: { owner: 'self', zones: ['field'], cardTypes: ['spirit'], families: ['Imp'] } }]
  });
}

// BS13-019 — recycle a High Speed Spirit at End Step; refresh newly-Braved Spirits during either Attack Step.
{
  const c = card('BS13-019');
  putAbility(c, {
    id: 'bs13-019-end-auto29', schemaVersion: 2,
    trigger: field('endStep', 'self'), levels: [1,2],
    actions: [{
      type: 'selectTarget', selector: { owner: 'self', zones: ['field'], cardTypes: ['spirit'], keywords: ['highspeed'], excludeSource: true }, allowZero: true,
      onSelect: { type: 'returnToHand' }, afterSelect: [{ type: 'refresh', target: 'source' }]
    }]
  });
  putAbility(c, {
    id: 'bs13-019-braved-auto29', schemaVersion: 2,
    trigger: field('whenBraved', 'self'), levels: [2],
    conditions: [{ type: 'phase', value: 'attack' }],
    actions: [{ type: 'refresh', target: 'effectSource' }]
  });
}

// BS13-021 — High Speed is engine-native; when destroyed, refresh one Spirit.
{
  const c = card('BS13-021');
  putEffect(c, {
    id: 'bs13-021-high-speed-auto29', type: 'highSpeed', timing: 'flash', levels: [1,2],
    title: { en: 'High Speed', ptBR: 'High Speed' },
    text: { en: 'This Spirit may be summoned from hand during Flash timing by paying its cost from the Reserve.', ptBR: 'Este Spirit pode ser Invocado da mão durante o Flash Timing pagando seu custo com a Reserve.' }
  });
  putAbility(c, {
    id: 'bs13-021-destroyed-auto29', schemaVersion: 2,
    trigger: source('whenDestroyed'), levels: [1,2],
    actions: [{ type: 'selectTarget', selector: { owner: 'self', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: { type: 'refresh' } }]
  });
}

// BS13-031 — Armored Dragon Spirits may block while exhausted; BP bonus scales with Armored Dragons.
{
  const c = card('BS13-031');
  putAbility(c, {
    id: 'bs13-031-exhausted-block-auto29', schemaVersion: 2,
    trigger: source('continuous'), levels: [1,2],
    actions: [{ type: 'addModifier', property: 'allowExhaustedBlock', operation: 'set', value: 1, selector: { owner: 'self', cardTypes: ['spirit'], families: ['Armored Dragon'] }, duration: 'whileSourceExists' }]
  });
  putAbility(c, {
    id: 'bs13-031-block-auto29', schemaVersion: 2,
    trigger: source('whenBlocks'), levels: [2],
    actions: [{ type: 'modifyBP', target: 'source', duration: 'battle', amountPerMatching: 2000, countSelector: { owner: 'self', zones: ['field'], cardTypes: ['spirit'], families: ['Armored Dragon'] } }]
  });
}

// BS13-051 — sacrifice one of your Spirits, then the opponent destroys one of theirs.
{
  const c = card('BS13-051');
  putAbility(c, {
    id: 'bs13-051-summon-auto29', schemaVersion: 2,
    trigger: source('whenSummoned'), levels: [1],
    actions: [{
      type: 'selectTarget', selector: { owner: 'self', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true,
      onSelect: { type: 'destroy' },
      afterSelect: [{ type: 'selectTarget', chooser: 'opponent', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: false, onSelect: { type: 'destroy' } }]
    }]
  });
}

// BS13-054 — opponent exhausts two Spirits on Brave summon.
{
  const c = card('BS13-054');
  putAbility(c, {
    id: 'bs13-054-summon-auto29', schemaVersion: 2,
    trigger: source('whenSummoned'), levels: [1],
    actions: [{ type: 'selectMultipleTargets', chooser: 'opponent', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, maxTargets: 2, minTargets: 2, asManyAsPossible: true, onConfirm: { type: 'exhaust' } }]
  });
}

// BS13-066 — opponent-caused destruction adds a Core; attack Life loss adds a Core and refreshes a Spirit.
{
  const c = card('BS13-066');
  putAbility(c, {
    id: 'bs13-066-destroyed-auto29', schemaVersion: 2,
    trigger: field('whenDestroyed', 'self'), levels: [1,2],
    conditions: [{ type: 'eventSourceCardType', cardType: 'spirit' }, { type: 'eventDestroyedByOpponent' }],
    actions: [{ type: 'addCoreToReserveFromVoid', player: 'self', amount: 1 }]
  });
  putAbility(c, {
    id: 'bs13-066-life-auto29', schemaVersion: 2,
    trigger: field('lifeDecreased', 'self'), levels: [2],
    conditions: [{ type: 'activePlayer', player: 'opponent' }, { type: 'battleAttackerCardType', cardType: 'spirit' }],
    actions: [
      { type: 'addCoreToReserveFromVoid', player: 'self', amount: 1 },
      { type: 'selectTarget', selector: { owner: 'self', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: { type: 'refresh' } }
    ]
  });
}

// BS13-076 — choose one exhausted Braved Spirit, or two exhausted low-cost Spirits, to destroy.
{
  const c = card('BS13-076');
  putAbility(c, {
    id: 'bs13-076-flash-auto29', schemaVersion: 2,
    trigger: source('magicFlash'),
    actions: [{ type: 'chooseOption', titleEN: 'Assassinate', titlePT: 'Assassinate', options: [
      { id: 'braved', labelEN: 'Destroy 1 exhausted Braved Spirit', labelPT: 'Destruir 1 Spirit Combinado Exhausted', actions: [{ type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'], braved: true, exhausted: true }, allowZero: true, onSelect: { type: 'destroy' } }] },
      { id: 'low', labelEN: 'Destroy 2 exhausted Cost 3-or-less Spirits', labelPT: 'Destruir 2 Spirits Exhausted de custo 3 ou menos', actions: [{ type: 'selectMultipleTargets', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'], exhausted: true, maximumCost: 3 }, maxTargets: 2, asManyAsPossible: true, allowZero: true, onConfirm: { type: 'destroy' } }] }
    ] }]
  });
}

// BS13-080 — bounce one Spirit, then another if a Strike-named Spirit is controlled.
{
  const c = card('BS13-080');
  putAbility(c, {
    id: 'bs13-080-flash-auto29', schemaVersion: 2,
    trigger: source('magicFlash'),
    actions: [
      { type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: { type: 'returnToHand' } },
      { type: 'conditional', condition: { controls: { owner: 'self', zones: ['field'], cardTypes: ['spirit'], nameIncludes: 'Strike' } }, actions: [{ type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: { type: 'returnToHand' } }] }
    ]
  });
}



// --- BS13 second wave: reusable Trash/Brave/Nexus/Magic families ---
const trash = (event, eventPlayer = 'any') => ({ event, scope: 'controllerTrash', eventPlayer });

// BS13-012 — Immortality Cost 7/8 + destroyed Core removal.
{
  const c = card('BS13-012');
  putEffect(c, { id:'bs13-012-immortality-auto29', type:'immortality', timing:'whenDestroyed', title:{en:'Immortality: Cost 7/8',ptBR:'Immortality: Cost 7/8'}, text:{en:'When one of your Cost 7 or 8 Spirits is destroyed during either Attack Step, you may summon this card from your Trash.',ptBR:'Quando um dos seus Spirits de custo 7 ou 8 for destruído durante qualquer Attack Step, você pode invocar esta carta do Trash.'} });
  putAbility(c, { id:'bs13-012-immortality-trigger-auto29', schemaVersion:2, trigger:trash('whenDestroyed','self'), conditions:[{type:'phase',value:'attack'},{any:[{type:'eventSourceCost',equals:7},{type:'eventSourceCost',equals:8}]}], actions:[{type:'specialSummonSource'}] });
  putAbility(c, { id:'bs13-012-destroyed-auto29', schemaVersion:2, trigger:source('whenDestroyed'), levels:[1,2,3], actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],minimumCores:1},allowZero:true,onSelect:{type:'removeCore',amount:1,destination:'trash'}}] });
}

// BS13-015 — Trash recovery, Curse/Immortality recycle and colorless attackers.
{
  const c = card('BS13-015');
  putAbility(c,{id:'bs13-015-trash-end-auto29',schemaVersion:2,trigger:trash('endStep','self'),actions:[{type:'returnToHand',target:'source'}]});
  putAbility(c,{id:'bs13-015-summon-auto29',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],actions:[{type:'selectTarget',selector:{owner:'self',zones:['trash'],cardTypes:['spirit'],keywords:['curse','immortality']},allowZero:true,onSelect:{type:'returnToHand'}}]});
  putAbility(c,{id:'bs13-015-colorless-auto29',schemaVersion:2,trigger:field('whenAttacks','self'),levels:[2],conditions:[{type:'phase',value:'attack'},{any:[{type:'eventSourceKeyword',keyword:'curse'},{type:'eventSourceKeyword',keyword:'immortality'}]}],actions:[{type:'addModifier',property:'colors',operation:'set',value:[],selector:{instanceIdFromContext:'eventSourceInstanceId'},duration:'battle'}]});
}

// BS13-020 — BP scales with cores on source.
{
  const c=card('BS13-020');
  putAbility(c,{id:'bs13-020-attack-auto29',schemaVersion:2,trigger:source('whenAttacks'),levels:[2],actions:[{type:'modifyBP',target:'source',duration:'battle',amountPerSourceCore:1000}]});
}

// BS13-022 — destroyed grants reserve cores equal to current LV.
{
  const c=card('BS13-022');
  putAbility(c,{id:'bs13-022-destroyed-auto29',schemaVersion:2,trigger:source('whenDestroyed'),levels:[1,2,3],actions:[{type:'addCoreToReserveFromVoid',player:'self',countFromSourceLevel:true}]});
}

// BS13-023 — End Step mass refresh; Braved LV3 recycles attached Brave to refresh itself.
{
  const c=card('BS13-023');
  putAbility(c,{id:'bs13-023-end-auto29',schemaVersion:2,trigger:source('endStep','self'),levels:[1,2,3],actions:[{type:'refreshAllMatching',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],minimumLevel:2}}]});
  putAbility(c,{id:'bs13-023-braved-battle-auto29',schemaVersion:2,trigger:source('afterBattleResolution','self'),levels:[3],requiresCombined:true,actions:[{type:'selectTarget',selector:{owner:'self',zones:['other'],cardTypes:['brave'],combinedWithSource:true,includeCombined:true},allowZero:true,onSelect:{type:'returnToHand'},afterSelect:[{type:'refresh',target:'source'}]}]});
}

// BS13-024 — Imp scaling and refresh observer.
{
  const c=card('BS13-024');
  putAbility(c,{id:'bs13-024-summon-auto29',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],actions:[{type:'addCoreToReserveFromVoid',player:'self',countFromSelector:{owner:'self',zones:['field'],cardTypes:['spirit'],families:['Imp']}}]});
  putAbility(c,{id:'bs13-024-attack-auto29',schemaVersion:2,trigger:source('whenAttacks'),levels:[1,2],actions:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],families:['Imp'],refreshed:true},allowZero:true,onSelect:{type:'exhaust'},afterSelect:[{type:'modifyBP',target:'source',duration:'battle',amountFromSelectedBP:true}]}]});
  putAbility(c,{id:'bs13-024-refresh-auto29',schemaVersion:2,trigger:field('cardRefreshed','self'),levels:[2],conditions:[{type:'eventSourceIsNotSource'}],actions:[{type:'refresh',target:'source'}]});
}

// BS13-030 — Heavy Armor Purple/Blue + Braved bounce of one Spirit of each protected color.
{
  const c=card('BS13-030');
  putAbility(c,{id:'bs13-030-heavy-armor-auto29',schemaVersion:2,trigger:source('continuous'),levels:[1,2],actions:[{type:'addModifier',property:'effectImmunityColors',operation:'add',value:['purple','blue'],selector:'source',duration:'whileSourceExists'}]});
  putAbility(c,{id:'bs13-030-braved-battle-auto29',schemaVersion:2,trigger:source('whenBattles'),levels:[2],requiresCombined:true,actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],colors:['purple']},allowZero:true,onSelect:{type:'returnToHand'}},{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],colors:['blue']},allowZero:true,onSelect:{type:'returnToHand'}}]});
}

// BS13-037 — Kaiser Empereur alias + free Pentan summon.
{
  const c=card('BS13-037');
  putAbility(c,{id:'bs13-037-name-auto29',schemaVersion:2,trigger:source('continuous'),levels:[1,2,3],actions:[{type:'addModifier',property:'names',operation:'add',value:['The Kaiser Empereur'],selector:'source',duration:'whileSourceExists'}]});
  putAbility(c,{id:'bs13-037-summon-auto29',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2,3],actions:[{type:'selectTarget',selector:{owner:'self',zones:['hand'],cardTypes:['spirit'],nameIncludes:'Pentan'},allowZero:true,onSelect:{type:'specialSummonFromHand',free:true}}]});
}

// BS13-056 — Heavy Armor Red in Spirit form; Combined blocker gains BP per opposing symbol.
{
  const c=card('BS13-056');
  putAbility(c,{id:'bs13-056-spirit-form-auto29',schemaVersion:2,trigger:source('continuous'),levels:[1],requiresCombined:false,actions:[{type:'addModifier',property:'effectImmunityColors',operation:'add',value:['red'],selector:{owner:'self',cardTypes:['spirit']},duration:'whileSourceExists'}]});
  putAbility(c,{id:'bs13-056-combined-block-auto29',schemaVersion:2,trigger:field('whenBlocks','self'),levels:[1],requiresCombined:true,conditions:[{type:'eventSourceIsCombinedHost'}],actions:[{type:'modifyBP',target:'effectSource',duration:'battle',amountPerBattleOpponentSymbol:5000}]});
}

// BS13-063 — low-core attackers are destroyed; Draw Step discard converts into two extra draws.
{
  const c=card('BS13-063');
  putAbility(c,{id:'bs13-063-attack-auto29',schemaVersion:2,trigger:field('whenAttacks','any'),levels:[1,2],conditions:[{type:'eventSourceCardType',cardType:'spirit'},{type:'eventSourceCoreCount',atMost:2}],actions:[{type:'destroy',target:'effectSource'}]});
  putAbility(c,{id:'bs13-063-draw-auto29',schemaVersion:2,trigger:source('drawStep','self'),levels:[2],actions:[{type:'selectTarget',selector:{owner:'self',zones:['hand'],cardTypes:['spirit'],keywords:['curse','immortality']},allowZero:true,onSelect:{type:'discard'},afterSelect:[{type:'draw',count:2}]}]});
}

// BS13-070 — low-cost LV1 attacks cannot reduce Life; once-per-turn Life restore on opponent attack.
{
  const c=card('BS13-070');
  putAbility(c,{id:'bs13-070-attack-lock-auto29',schemaVersion:2,trigger:field('whenAttacks','any'),levels:[1,2],conditions:[{type:'eventSourceCardType',cardType:'spirit'},{type:'eventSourceCost',atMost:3},{type:'eventSourceLevel',equals:1}],actions:[{type:'setBattleRestriction',restriction:{preventLifeDamage:true}}]});
  putAbility(c,{id:'bs13-070-life-auto29',schemaVersion:2,trigger:source('lifeDecreased','self'),levels:[2],conditions:[{type:'activePlayer',player:'opponent'},{type:'sourceState',value:'refreshed'}],actions:[{type:'oncePerTurn',key:'bs13-070-life-restore',actions:[{type:'exhaust',target:'source'},{type:'healLife',count:1}]}]});
}

// BS13-077 — once-per-turn Trash recovery + Flash BP boost.
{
  const c=card('BS13-077');
  putAbility(c,{id:'bs13-077-trash-end-auto29',schemaVersion:2,trigger:trash('endStep','self'),actions:[{type:'oncePerTurn',key:'bs13-077-trash-return',actions:[{type:'returnToHand',target:'source'}]}]});
  putAbility(c,{id:'bs13-077-flash-auto29',schemaVersion:2,trigger:source('magicFlash'),actions:[{type:'selectTarget',selector:{owner:'any',zones:['field'],cardTypes:['spirit']},allowZero:false,onSelect:{type:'modifyBP',amount:3000,duration:'turn'}}]});
}

fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2) + '\n');
console.log('[batch09] patched BS13 first + second-wave automation.');
