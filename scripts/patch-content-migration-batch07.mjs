import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cardsPath = path.join(root, 'src/data/cards.json');
const sd28Path = path.join(root, 'src/data/SD28.json');
const resourceSd28Path = path.join(root, 'resources/v3-data/SD28.json');
const raw = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
const cards = Array.isArray(raw) ? raw : raw.cards;

function card(id) {
  const found = cards.find((c) => c.id === id);
  if (!found) throw new Error(`Missing card ${id}`);
  found.abilities ??= [];
  found.effects ??= [];
  return found;
}
function effect(c, id) {
  const found = c.effects.find((e) => e.id === id);
  if (!found) throw new Error(`Missing effect ${c.id}/${id}`);
  return found;
}
function putAbility(c, ability) {
  const i = c.abilities.findIndex((a) => a.id === ability.id);
  if (i >= 0) c.abilities[i] = ability;
  else c.abilities.push(ability);
}
function wire(c, effectId, abilityId, timing) {
  const e = effect(c, effectId);
  e.automationRef = abilityId;
  if (timing) e.timing = timing;
}
const source = (event) => ({ event, scope: 'source', eventPlayer: 'any' });
const controllerField = (event) => ({ event, scope: 'controllerField', eventPlayer: 'any' });
const controllerHand = (event) => ({ event, scope: 'controllerHand', eventPlayer: 'any' });

// SD28-001 — High Speed is now an engine-native legal Flash action.
{
  const c = card('SD28-001');
  effect(c, 'sd28-001-high-speed-display').timing = 'flash';
}

// SD28-002 — Spirit Soul reduction + non-Braved opposing Ultimate exhaustion.
{
  const c = card('SD28-002');
  wire(c, 'sd28-002-spirit-soul-display', 'sd28-002-spirit-soul-auto27');
  wire(c, 'sd28-002-destroyed-display', 'sd28-002-destroyed-auto27', 'whenDestroyed');
  putAbility(c, {
    id: 'sd28-002-spirit-soul-auto27', schemaVersion: 2, trigger: source('continuous'), levels: [1,2],
    actions: [{ type: 'addModifier', property: 'summonReductionSymbols', operation: 'add', value: ['green'], duration: 'whileSourceExists', selector: { owner: 'self', cardTypes: ['ultimate'] } }]
  });
  putAbility(c, {
    id: 'sd28-002-destroyed-auto27', schemaVersion: 2, trigger: source('whenDestroyed'), levels: [1,2],
    actions: [{ type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['ultimate'], notCombinedWithBrave: true }, allowZero: true, onSelect: { type: 'exhaust' } }]
  });
}

// SD28-003 — Core gain + Shellman Ultimate battle Burst lock.
{
  const c = card('SD28-003');
  wire(c, 'sd28-003-summon-display', 'sd28-003-summon-auto27', 'whenSummoned');
  wire(c, 'sd28-003-burst-lock-display', 'sd28-003-burst-lock-auto27', 'whenBattles');
  putAbility(c, { id: 'sd28-003-summon-auto27', schemaVersion: 2, trigger: source('whenSummoned'), levels: [1,2], actions: [{ type: 'addCoreToReserveFromVoid', count: 1 }] });
  putAbility(c, {
    id: 'sd28-003-burst-lock-auto27', schemaVersion: 2, trigger: controllerField('whenBattles'), levels: [2],
    conditions: [{ type: 'eventSourceCardType', cardType: 'ultimate' }, { type: 'eventSourceFamily', family: 'Shellman' }],
    actions: [{ type: 'setBattleRestriction', preventOpponentBurst: true }]
  });
}

// SD28-004 — effect-destruction immunity + Green Ultimate Trigger recovery.
{
  const c = card('SD28-004');
  wire(c, 'sd28-004-protection-display', 'sd28-004-protection-auto27');
  wire(c, 'sd28-004-trigger-recovery-display', 'sd28-004-trigger-recovery-auto27', 'ultimateTriggerResolved');
  putAbility(c, { id: 'sd28-004-protection-auto27', schemaVersion: 2, trigger: source('continuous'), levels: [1,2], actions: [{ type: 'addModifier', property: 'effectDestructionImmune', value: 1, duration: 'whileSourceExists', selector: 'source' }] });
  putAbility(c, {
    id: 'sd28-004-trigger-recovery-auto27', schemaVersion: 2, trigger: controllerField('ultimateTriggerResolved'), levels: [2],
    conditions: [{ type: 'activePlayer', player: 'opponent' }],
    actions: [{ type: 'returnUltimateTriggerRevealedMatchingToHand', selector: { owner: 'self', colors: ['green'] } }]
  });
}

// SD28-005 — Attack Step +3000 BP aura.
{
  const c = card('SD28-005');
  wire(c, 'sd28-005-bp-display', 'sd28-005-bp-auto27');
  putAbility(c, {
    id: 'sd28-005-bp-auto27', schemaVersion: 2, trigger: source('continuous'), levels: [1,2],
    actions: [{ type: 'addModifier', property: 'bp', value: 3000, duration: 'whileConditionTrue', condition: { type: 'phase', value: 'attack' }, selector: { owner: 'self', cardTypes: ['spirit','ultimate'], families: ['Shellman','Blade Insect'] } }]
  });
}

// SD28-006 — free Exalted Sword summon + attack exhaustion upgrades.
{
  const c = card('SD28-006');
  wire(c, 'sd28-006-summon-display', 'sd28-006-summon-auto27', 'whenSummoned');
  wire(c, 'sd28-006-attack-display', 'sd28-006-attack-auto27', 'whenAttacks');
  wire(c, 'sd28-006-braved-display', 'sd28-006-braved-auto27', 'whenAttacks');
  putAbility(c, {
    id: 'sd28-006-summon-auto27', schemaVersion: 2, trigger: source('whenSummoned'), levels: [1,2,3],
    actions: [{ type: 'selectTarget', selector: { owner: 'self', zones: ['hand'], cardTypes: ['brave'], colors: ['green'], families: ['Exalted Sword'] }, allowZero: true, onSelect: { type: 'specialSummonFromHand', allowedCardTypes: ['brave'] } }]
  });
  putAbility(c, { id: 'sd28-006-attack-auto27', schemaVersion: 2, trigger: source('whenAttacks'), levels: [2,3], actions: [{ type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: { type: 'exhaust' } }] });
  putAbility(c, { id: 'sd28-006-braved-auto27', schemaVersion: 2, trigger: source('whenAttacks'), levels: [3], requiresCombined: true, actions: [{ type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit','ultimate'] }, allowZero: true, onSelect: { type: 'exhaust' } }] });
}

// SD28-007 — ignore Green Ultimate summon conditions, Shellman symbol, Trigger HIT.
{
  const c = card('SD28-007');
  wire(c, 'sd28-007-continuous-display', 'sd28-007-continuous-auto27');
  const trig = effect(c, 'sd28-007-ultimate-trigger');
  trig.automationRef = 'sd28-007-trigger-hit-auto27';
  trig.onHitOperations = [{ type: 'selectMultipleTargets', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, maxTargets: 2, asManyAsPossible: true, allowZero: true, onConfirm: { type: 'exhaust' } }];
  putAbility(c, {
    id: 'sd28-007-continuous-auto27', schemaVersion: 2, trigger: source('continuous'), levels: [3,4],
    actions: [
      { type: 'addModifier', property: 'ignoreSummoningCondition', value: 1, duration: 'whileSourceExists', selector: { owner: 'self', cardTypes: ['ultimate'], colors: ['green'] } },
      { type: 'addModifier', property: 'symbols', operation: 'add', value: ['green'], duration: 'whileSourceExists', selector: { owner: 'self', cardTypes: ['ultimate'], families: ['Shellman'] } }
    ]
  });
  putAbility(c, { id: 'sd28-007-trigger-hit-auto27', schemaVersion: 2, trigger: source('ultimateTriggerHit'), levels: [4], actions: trig.onHitOperations });
}

// SD28-008 — battle exhaustion + existing combined Ultimate Trigger HIT.
{
  const c = card('SD28-008');
  wire(c, 'sd28-008-battle-display', 'sd28-008-battle-auto27', 'whenBattles');
  wire(c, 'sd28-008-combined-trigger-display', 'sd28-008-utrigger-hit-v2', 'whenAttacks');
  putAbility(c, { id: 'sd28-008-battle-auto27', schemaVersion: 2, trigger: source('whenBattles'), levels: [3,4], actions: [{ type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'], maximumCost: 5 }, allowZero: true, onSelect: { type: 'exhaust' } }] });
}

// SD28-009 — +2 Core on summon; Trigger/XU structures retained.
{
  const c = card('SD28-009');
  wire(c, 'sd28-009-summon-display', 'sd28-009-summon-auto27', 'whenSummoned');
  wire(c, 'sd28-009-ultimate-trigger', 'sd28-009-utrigger-hit-v2', 'whenAttacks');
  putAbility(c, { id: 'sd28-009-summon-auto27', schemaVersion: 2, trigger: source('whenSummoned'), levels: [3,4,5], actions: [{ type: 'addCoreFromVoid', count: 2, target: 'source' }] });
}

// SD28-010 — High Speed + Braved Ultimate battle BP bonus.
{
  const c = card('SD28-010');
  wire(c, 'sd28-010-combined-display', 'sd28-010-combined-auto27', 'whenBattles');
  putAbility(c, {
    id: 'sd28-010-combined-auto27', schemaVersion: 2, trigger: controllerField('whenBattles'),
    conditions: [{ type: 'eventSourceIsCombinedHost' }, { type: 'eventSourceCardType', cardType: 'ultimate' }],
    actions: [{ type: 'modifyBP', amount: 5000, duration: 'battle', target: 'effectSource' }]
  });
}

// SD28-011 — Core placement + Spirit/Ultimate-specific Braved riders.
{
  const c = card('SD28-011');
  wire(c, 'sd28-011-summon-display', 'sd28-011-summon-auto27', 'whenSummoned');
  wire(c, 'sd28-011-spirit-combined-display', 'sd28-011-spirit-combined-auto27', 'whenAttacks');
  wire(c, 'sd28-011-ultimate-combined-display', 'sd28-011-ultimate-combined-auto27', 'whenAttacks');
  putAbility(c, { id: 'sd28-011-summon-auto27', schemaVersion: 2, trigger: source('whenSummoned'), actions: [{ type: 'selectTarget', selector: { owner: 'self', zones: ['field'], cardTypes: ['ultimate'] }, allowZero: true, onSelect: { type: 'addCoreFromVoid', count: 1 } }] });
  putAbility(c, { id: 'sd28-011-spirit-combined-auto27', schemaVersion: 2, trigger: controllerField('whenAttacks'), conditions: [{ type: 'eventSourceIsCombinedHost' }, { type: 'eventSourceCardType', cardType: 'spirit' }], actions: [{ type: 'modifyBP', amount: 5000, duration: 'battle', target: 'effectSource' }] });
  putAbility(c, { id: 'sd28-011-ultimate-combined-auto27', schemaVersion: 2, trigger: controllerField('whenAttacks'), conditions: [{ type: 'eventSourceIsCombinedHost' }, { type: 'eventSourceCardType', cardType: 'ultimate' }], actions: [{ type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: { type: 'exhaust' } }] });
}

// SD28-012 — opponent Attack Step life draw + activated Flash reveal routing.
{
  const c = card('SD28-012');
  wire(c, 'sd28-012-life-display', 'sd28-012-life-auto27', 'lifeDecreased');
  wire(c, 'sd28-012-flash-display', 'sd28-012-flash-auto27', 'magicFlash');
  putAbility(c, { id: 'sd28-012-life-auto27', schemaVersion: 2, trigger: controllerField('lifeDecreased'), levels: [1,2], conditions: [{ type: 'activePlayer', player: 'opponent' }], actions: [{ type: 'draw', count: 1 }] });
  putAbility(c, {
    id: 'sd28-012-flash-auto27', schemaVersion: 2, trigger: source('magicFlash'), levels: [2], actions: [
      { type: 'exhaust', target: 'source' },
      { type: 'revealTop', player: 'self', count: 2 },
      { type: 'selectTarget', selector: { owner: 'self', zones: ['revealed'], cardTypes: ['brave'], colors: ['green'], families: ['Exalted Sword'] }, allowZero: true, onSelect: { type: 'returnToHand' } },
      { type: 'returnToBottomDeck', selector: { owner: 'self', zones: ['revealed'] } }
    ]
  });
}

// SD28-013 — existing Trigger Counter + paid Flash exhaustion.
{
  const c = card('SD28-013');
  wire(c, 'sd28-013-flash-display', 'sd28-013-flash-auto27', 'magicFlash');
  putAbility(c, { id: 'sd28-013-flash-auto27', schemaVersion: 2, trigger: source('magicFlash'), actions: [{ type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: { type: 'exhaust' } }] });
}

// SD28-014 — opponent-hand-increase Burst + dynamic Flash target count.
{
  const c = card('SD28-014');
  wire(c, 'sd28-014-burst-display', 'sd28-014-burst-auto27', 'burstOpponentHandIncrease');
  wire(c, 'sd28-014-flash-display', 'sd28-014-flash-auto27', 'magicFlash');
  putAbility(c, {
    id: 'sd28-014-burst-auto27', schemaVersion: 2, trigger: source('burstOpponentHandIncrease'), actions: [
      { type: 'addCoreToReserveFromVoid', countFromContext: 'burstOpportunity.amount' },
      { type: 'chooseYesNo', titleEN: 'Activate Flash?', titlePT: 'Ativar Flash?', yesActions: [{ type: 'paySourceCost', actions: [{ type: 'dispatchSourceEvent', event: 'magicFlash' }] }] }
    ]
  });
  putAbility(c, { id: 'sd28-014-flash-auto27', schemaVersion: 2, trigger: source('magicFlash'), actions: [{ type: 'selectMultipleTargets', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, targetCountFrom: { owner: 'opponent', zone: 'hand', divisor: 2 }, asManyAsPossible: true, allowZero: true, onConfirm: { type: 'exhaust' } }] });
}

// SD28-015 — refresh all Braved Ultimates and disable their Ultimate Trigger for the turn.
{
  const c = card('SD28-015');
  wire(c, 'sd28-015-flash-display', 'sd28-015-flash-auto27', 'magicFlash');
  putAbility(c, { id: 'sd28-015-flash-auto27', schemaVersion: 2, trigger: source('magicFlash'), actions: [
    { type: 'refreshAllMatching', selector: { owner: 'self', zones: ['field'], cardTypes: ['ultimate'], braved: true } },
    { type: 'addModifier', property: 'ultimateTriggerDisabled', value: 1, duration: 'turn', selector: { owner: 'self', cardTypes: ['ultimate'], braved: true } }
  ] });
}

// SD28-X01 — destruction Burst, free self summon, Battle Trigger HIT rider.
{
  const c = card('SD28-X01');
  wire(c, 'sd28-x01-burst-display', 'sd28-x01-burst-auto27', 'burstOwnSpiritDestroyed');
  wire(c, 'sd28-x01-battle-trigger-display', 'sd28-x01-trigger-hit-auto27', 'whenBattles');
  const hit = effect(c, 'sd28-x01-battle-trigger-display');
  hit.onHitOperations = [{ type: 'setBattleRestriction', restriction: { sd28UshiwakaHit: true } }];
  putAbility(c, {
    id: 'sd28-x01-burst-auto27', schemaVersion: 2, trigger: source('burstOwnSpiritDestroyed'), actions: [
      { type: 'chooseOption', titleEN: 'Exhaust targets', titlePT: 'Exaurir alvos', options: [
        { id: 'spirits', labelEN: 'Up to 2 Spirits', labelPT: 'Até 2 Spirits', actions: [{ type: 'selectMultipleTargets', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, maxTargets: 2, asManyAsPossible: true, allowZero: true, onConfirm: { type: 'exhaust' } }] },
        { id: 'ultimate', labelEN: '1 Ultimate', labelPT: '1 Ultimate', actions: [{ type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['ultimate'] }, allowZero: true, onSelect: { type: 'exhaust' } }] }
      ] },
      { type: 'specialSummonSource' }
    ]
  });
  putAbility(c, { id: 'sd28-x01-trigger-hit-auto27', schemaVersion: 2, trigger: source('ultimateTriggerHit'), levels: [4,5], actions: hit.onHitOperations });
  putAbility(c, {
    id: 'sd28-x01-after-battle-auto27', schemaVersion: 2, trigger: source('afterBattleResolution'), levels: [4,5], conditions: [{ type: 'battleRestriction', key: 'sd28UshiwakaHit' }],
    actions: [{ type: 'chooseYesNo', titleEN: 'Return this Ultimate to hand to refresh an Ultimate?', titlePT: 'Retornar este Ultimate à mão para refrescar um Ultimate?', yesActions: [
      { type: 'returnToHand', target: 'source' },
      { type: 'selectTarget', selector: { owner: 'self', zones: ['field'], cardTypes: ['ultimate'] }, allowZero: true, onSelect: { type: 'refresh' } }
    ] }]
  });
}

// SD28-X02 — hand observer free summon + cost-0 rider + Burst lock.
{
  const c = card('SD28-X02');
  wire(c, 'sd28-x02-free-summon-display', 'sd28-x02-free-summon-auto27', 'whenSummoned');
  wire(c, 'sd28-x02-cost-display', 'sd28-x02-cost-auto27', 'whenBraved');
  wire(c, 'sd28-x02-burst-lock-display', 'sd28-x02-burst-lock-auto27', 'whenBattles');
  putAbility(c, {
    id: 'sd28-x02-free-summon-auto27', schemaVersion: 2, trigger: controllerHand('whenSummoned'), levels: [1],
    conditions: [{ type: 'eventSourceCardType', cardType: 'ultimate' }],
    actions: [{ type: 'selectTarget', selector: { owner: 'self', zones: ['hand'], instanceIdFromContext: 'sourceInstanceId' }, allowZero: true, onSelect: { type: 'specialSummonFromHand', allowedCardTypes: ['brave'] } }]
  });
  putAbility(c, {
    id: 'sd28-x02-cost-auto27', schemaVersion: 2, trigger: source('whenBraved'), levels: [1], requiresCombined: true,
    conditions: [{ type: 'combinedHostLacksEffectType', effectType: 'xuTrigger' }],
    actions: [{ type: 'addModifier', property: 'cost', operation: 'set', value: 0, duration: 'whileSourceExists', selector: 'source' }]
  });
  putAbility(c, {
    id: 'sd28-x02-burst-lock-auto27', schemaVersion: 2, trigger: controllerField('whenBattles'), levels: [1],
    conditions: [{ type: 'eventSourceIsCombinedHost' }, { type: 'eventSourceCardType', cardType: 'ultimate' }],
    actions: [{ type: 'setBattleRestriction', preventOpponentBurst: true }]
  });
}

// Keep standalone SD28 file synchronized with the canonical cards DB.
const sdRaw = JSON.parse(fs.readFileSync(sd28Path, 'utf8'));
const sdCards = Array.isArray(sdRaw) ? sdRaw : sdRaw.cards;
for (let i = 0; i < sdCards.length; i += 1) {
  const updated = cards.find((c) => c.id === sdCards[i].id);
  if (updated) sdCards[i] = updated;
}

fs.writeFileSync(cardsPath, JSON.stringify(raw, null, 2) + '\n');
fs.writeFileSync(sd28Path, JSON.stringify(sdRaw, null, 2) + '\n');
fs.writeFileSync(resourceSd28Path, JSON.stringify(sdRaw, null, 2) + '\n');
console.log('Content Migration Batch 07 patch applied to SD28.');
