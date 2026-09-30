import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cardsPath = path.join(root, 'src/data/cards.json');
const sd15Path = path.join(root, 'src/data/SD15.json');
const resourceSd15Path = path.join(root, 'resources/v3-data/SD15.json');
const raw = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
const cards = Array.isArray(raw) ? raw : raw.cards;

function card(id) {
  const found = cards.find((c) => c.id === id && c.set === 'SD15');
  if (!found) throw new Error(`Missing SD15 runtime card ${id}`);
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
const source = (event, eventPlayer = 'any') => ({ event, scope: 'source', eventPlayer });
const field = (event, eventPlayer = 'any') => ({ event, scope: 'controllerField', eventPlayer });
const strength = (levels) => ({
  schemaVersion: 2,
  trigger: source('continuous'),
  levels,
  actions: [{ type: 'addModifier', property: 'bpReductionBonus', value: 1000, duration: 'whileSourceExists', selector: 'source' }]
});

// SD15-001 — Strengthening.
{
  const c = card('SD15-001');
  wire(c, 'sd15-001-strengthening', 'sd15-001-strengthening-auto28');
  putAbility(c, { id: 'sd15-001-strengthening-auto28', ...strength([1,2]) });
}

// SD15-002 — Strengthening + zero-BP global exhaust observer.
{
  const c = card('SD15-002');
  wire(c, 'sd15-002-strengthening', 'sd15-002-strengthening-auto28');
  wire(c, 'sd15-002-zero-bp', 'sd15-002-zero-bp-auto28', 'bpBecameZero');
  putAbility(c, { id: 'sd15-002-strengthening-auto28', ...strength([1,2]) });
  putAbility(c, {
    id: 'sd15-002-zero-bp-auto28', schemaVersion: 2, trigger: field('bpBecameZero', 'opponent'), levels: [2],
    actions: [{ type: 'exhaustAllMatching', selector: { owner: 'any', zones: ['field'], cardTypes: ['spirit'], maximumBP: 0 } }]
  });
}

// SD15-003 — existing attack reduction + low-cost attack lock after destruction.
{
  const c = card('SD15-003');
  wire(c, 'sd15-003-attack', 'sd15-003-attack-auto23', 'whenAttacks');
  wire(c, 'sd15-003-destroyed', 'sd15-003-destroyed-auto28', 'whenDestroyed');
  putAbility(c, {
    id: 'sd15-003-destroyed-auto28', schemaVersion: 2, trigger: source('whenDestroyed'), levels: [2,3],
    actions: [{ type: 'addModifier', property: 'cannotAttack', value: 1, duration: 'turn', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'], maximumCost: 3 } }]
  });
}

// SD15-004 — existing attack BP reduction + treat eligible blocked attack as unblocked.
{
  const c = card('SD15-004');
  wire(c, 'sd15-004-attack-bp', 'sd15-004-attack-bp-auto23', 'whenAttacks');
  wire(c, 'sd15-004-unblocked', 'sd15-004-unblocked-auto28', 'beforeBattleResolution');
  putAbility(c, {
    id: 'sd15-004-unblocked-auto28', schemaVersion: 2, trigger: source('beforeBattleResolution'), levels: [2,3],
    conditions: [{ type: 'battleBlockerBPAtMostSourceBP' }],
    actions: [{ type: 'setBattleRestriction', restriction: { treatAsUnblocked: true } }]
  });
}

// SD15-005 — Strengthening, low-BP Life protection and self recovery.
{
  const c = card('SD15-005');
  wire(c, 'sd15-005-strengthening', 'sd15-005-strengthening-auto28');
  wire(c, 'sd15-005-life-protection', 'sd15-005-life-protection-auto28');
  wire(c, 'sd15-005-destroyed', 'sd15-005-destroyed-auto28', 'whenDestroyed');
  putAbility(c, { id: 'sd15-005-strengthening-auto28', ...strength([1,2,3]) });
  putAbility(c, {
    id: 'sd15-005-life-protection-auto28', schemaVersion: 2, trigger: source('continuous'), levels: [2,3],
    actions: [{ type: 'addModifier', property: 'lifeProtectionMaxAttackerBP', value: 4000, duration: 'whileSourceExists', selector: 'source' }]
  });
  putAbility(c, {
    id: 'sd15-005-destroyed-auto28', schemaVersion: 2, trigger: source('whenDestroyed'), levels: [3],
    actions: [{ type: 'returnToHand', target: 'source' }]
  });
}

// SD15-X01 — existing attack BP reduction + recovery of low-cost Spirits + zero-BP destruction.
{
  const c = card('SD15-X01');
  wire(c, 'sd15-x01-attack-bp', 'sd15-x01-attack-bp-auto23', 'whenAttacks');
  wire(c, 'sd15-x01-recovery', 'sd15-x01-recovery-auto28', 'whenDestroyed');
  wire(c, 'sd15-x01-zero-bp', 'sd15-x01-zero-bp-auto28', 'bpBecameZero');
  putAbility(c, {
    id: 'sd15-x01-recovery-auto28', schemaVersion: 2, trigger: field('whenDestroyed', 'self'), levels: [1,2,3],
    conditions: [{ type: 'eventSourceCardType', cardType: 'spirit' }, { type: 'eventSourceCost', atMost: 3 }, { type: 'eventCause', value: 'effect' }, { type: 'eventDestroyedByOpponent' }],
    actions: [{ type: 'returnToHand', target: 'effectSource' }, { type: 'draw', count: 1 }]
  });
  putAbility(c, {
    id: 'sd15-x01-zero-bp-auto28', schemaVersion: 2, trigger: field('bpBecameZero', 'opponent'), levels: [2,3],
    conditions: [{ type: 'eventZeroedBySource' }],
    actions: [{ type: 'destroyAllMatching', selector: { owner: 'any', zones: ['field'], cardTypes: ['spirit'], maximumBP: 0 } }]
  });
}

// BS05-037 — draw when own Cost 2 Spirit is destroyed during Attack Step.
{
  const c = card('BS05-037');
  wire(c, 'sd15-bs05-037-draw', 'sd15-bs05-037-draw-auto28', 'whenDestroyed');
  putAbility(c, {
    id: 'sd15-bs05-037-draw-auto28', schemaVersion: 2, trigger: field('whenDestroyed', 'self'), levels: [1,2,3],
    conditions: [{ type: 'eventSourceCardType', cardType: 'spirit' }, { type: 'eventSourceCost', equals: 2 }, { phase: 'attack' }],
    actions: [{ type: 'draw', count: 1 }]
  });
}

// BS08-042 — Holy Life + Brilliance.
{
  const c = card('BS08-042');
  wire(c, 'sd15-bs08-042-holy-life', 'sd15-bs08-042-holy-life-auto28', 'lifeDecreased');
  wire(c, 'sd15-bs08-042-brilliance', 'sd15-bs08-042-brilliance-auto28', 'afterBattleResolution');
  putAbility(c, {
    id: 'sd15-bs08-042-holy-life-auto28', schemaVersion: 2, trigger: field('lifeDecreased', 'opponent'), levels: [1,2,3],
    conditions: [{ type: 'battleSourceRole', role: 'attacker' }], actions: [{ type: 'healLife', player: 'self', amount: 1 }]
  });
  putAbility(c, {
    id: 'sd15-bs08-042-brilliance-auto28', schemaVersion: 2, trigger: source('afterBattleResolution'), levels: [3],
    actions: [{ type: 'returnMagicUsedThisBattle', player: 'self' }]
  });
}

// BS12-035 — move one Core from destroyed source to Life.
{
  const c = card('BS12-035');
  wire(c, 'sd15-bs12-035-destroyed', 'sd15-bs12-035-destroyed-auto28', 'whenDestroyed');
  putAbility(c, { id: 'sd15-bs12-035-destroyed-auto28', schemaVersion: 2, trigger: source('whenDestroyed'), levels: [1,2], actions: [{ type: 'moveCoreToLife', target: 'source', count: 1 }] });
}

// BS12-037 — 2-symbol attackers become 2000 BP; Divine Spirit destruction may feed Life.
{
  const c = card('BS12-037');
  wire(c, 'sd15-bs12-037-bp', 'sd15-bs12-037-bp-auto28', 'whenAttacks');
  wire(c, 'sd15-bs12-037-life', 'sd15-bs12-037-life-auto28', 'whenDestroyed');
  putAbility(c, {
    id: 'sd15-bs12-037-bp-auto28', schemaVersion: 2, trigger: field('whenAttacks', 'opponent'), levels: [1,2,3],
    conditions: [{ type: 'eventSourceCardType', cardType: 'spirit' }, { type: 'eventSourceSymbolCount', equals: 2 }],
    actions: [{ type: 'modifyBP', target: 'effectSource', setTo: 2000, duration: 'battle' }]
  });
  putAbility(c, {
    id: 'sd15-bs12-037-life-auto28', schemaVersion: 2, trigger: field('whenDestroyed', 'self'), levels: [2,3],
    conditions: [{ type: 'eventSourceFamily', family: 'Divine Spirit' }, { phase: 'attack' }],
    actions: [{ type: 'selectTarget', selector: { owner: 'self', zones: ['field'], minimumCores: 1 }, allowZero: true, onSelect: { type: 'moveCoreToLife', target: 'selected', count: 1 } }]
  });
}

// BS12-038 — designate blockers based on Divine Spirit count + Holy Life.
{
  const c = card('BS12-038');
  wire(c, 'sd15-bs12-038-summon', 'sd15-bs12-038-summon-auto28', 'whenSummoned');
  wire(c, 'sd15-bs12-038-holy-life', 'sd15-bs12-038-holy-life-auto28', 'lifeDecreased');
  putAbility(c, {
    id: 'sd15-bs12-038-summon-auto28', schemaVersion: 2, trigger: source('whenSummoned'), levels: [1,2,3],
    actions: [{
      type: 'selectMultipleTargets', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true,
      targetCountFrom: { selector: { owner: 'self', zones: ['field'], cardTypes: ['spirit'], families: ['Divine Spirit'] } },
      onConfirm: { type: 'addModifier', property: 'cannotBlock', value: 1, duration: 'turn', selector: { selectedTargets: true } }
    }]
  });
  putAbility(c, {
    id: 'sd15-bs12-038-holy-life-auto28', schemaVersion: 2, trigger: field('lifeDecreased', 'opponent'), levels: [3],
    conditions: [{ type: 'battleSourceRole', role: 'attacker' }], actions: [{ type: 'healLife', player: 'self', amount: 1 }]
  });
}

// SD02-005 — symbol-count reveal, Brilliance support and Brilliance recovery.
{
  const c = card('SD02-005');
  wire(c, 'sd15-sd02-005-summon', 'sd15-sd02-005-summon-auto28', 'whenSummoned');
  wire(c, 'sd15-sd02-005-brilliance-support', 'sd15-sd02-005-brilliance-support-auto28', 'whenBlocks');
  wire(c, 'sd15-sd02-005-brilliance', 'sd15-sd02-005-brilliance-auto28', 'afterBattleResolution');
  putAbility(c, {
    id: 'sd15-sd02-005-summon-auto28', schemaVersion: 2, trigger: source('whenSummoned'), levels: [1,2,3],
    actions: [{ type: 'revealTopAndRoute', player: 'self', countFromSymbolColor: 'yellow', matchSelector: { cardTypes: ['magic'] }, matchedDestination: 'hand', otherwiseDestination: 'bottomDeck' }]
  });
  putAbility(c, {
    id: 'sd15-sd02-005-brilliance-support-auto28', schemaVersion: 2, trigger: field('whenBlocks', 'opponent'), levels: [2,3],
    conditions: [{ type: 'battleAttackerKeyword', keyword: 'brilliance' }],
    actions: [{ type: 'modifyBP', target: 'effectSource', setToLevel: 1, duration: 'battle' }]
  });
  putAbility(c, {
    id: 'sd15-sd02-005-brilliance-auto28', schemaVersion: 2, trigger: source('afterBattleResolution'), levels: [3],
    actions: [{ type: 'returnMagicUsedThisBattle', player: 'self' }]
  });
}

// BS10-074 — combined battle exhausts Nexuses and disables exhausted Nexus effects.
{
  const c = card('BS10-074');
  wire(c, 'sd15-bs10-074-combined', 'sd15-bs10-074-combined-auto28', 'whenBattles');
  putAbility(c, {
    id: 'sd15-bs10-074-combined-auto28', schemaVersion: 2, trigger: source('whenBattles'), requiresCombined: true,
    actions: [
      { type: 'exhaustAllMatching', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['nexus'] } },
      { type: 'addModifier', property: 'effectsDisabled', value: 1, duration: 'turn', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['nexus'], exhausted: true } }
    ]
  });
}

// SD15-006 — free Divine Spirit recovery from Trash + block denial while combined.
{
  const c = card('SD15-006');
  wire(c, 'sd15-006-summon', 'sd15-006-summon-auto28', 'whenSummoned');
  wire(c, 'sd15-006-combined', 'sd15-006-combined-auto28', 'whenAttacks');
  putAbility(c, {
    id: 'sd15-006-summon-auto28', schemaVersion: 2, trigger: source('whenSummoned'), levels: [1],
    actions: [{ type: 'selectMultipleTargets', selector: { owner: 'self', zones: ['trash'], cardTypes: ['spirit'], families: ['Divine Spirit'], maximumCost: 3 }, maxTargets: 3, allowZero: true, onConfirm: { type: 'specialSummonFromTrash', target: 'selected', allowedCardTypes: ['spirit'] } }]
  });
  putAbility(c, {
    id: 'sd15-006-combined-auto28', schemaVersion: 2, trigger: source('whenAttacks'), requiresCombined: true,
    actions: [{ type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: { type: 'addModifier', property: 'cannotBlock', value: 1, duration: 'turn', selector: { selectedTarget: true } } }]
  });
}

// BSC05-020 — Life reveal/summon + destroy opponent-turn Spirit/Magic refreshes.
{
  const c = card('BSC05-020');
  wire(c, 'sd15-bsc05-020-life', 'sd15-bsc05-020-life-auto28', 'lifeDecreased');
  wire(c, 'sd15-bsc05-020-opponent-turn', 'sd15-bsc05-020-opponent-turn-auto28', 'cardRefreshed');
  putAbility(c, {
    id: 'sd15-bsc05-020-life-auto28', schemaVersion: 2, trigger: field('lifeDecreased', 'self'), levels: [1,2],
    actions: [{ type: 'revealTopAndSummonOrHand', player: 'self', matchSelector: { cardTypes: ['spirit'], maximumCost: 2 } }]
  });
  putAbility(c, {
    id: 'sd15-bsc05-020-opponent-turn-auto28', schemaVersion: 2, trigger: field('cardRefreshed', 'opponent'), levels: [2],
    conditions: [
      { type: 'activePlayer', player: 'opponent' },
      { any: [{ type: 'eventSourceColor', color: 'red' }, { type: 'eventSourceColor', color: 'green' }, { type: 'eventSourceColor', color: 'blue' }] },
      { any: [{ type: 'eventRefreshedByCardType', cardType: 'spirit' }, { type: 'eventRefreshedByCardType', cardType: 'magic' }] }
    ],
    actions: [{ type: 'destroy', target: 'effectSource' }]
  });
}

// SD15-007 — turn-long zero-BP reaction + immediate BP reduction.
{
  const c = card('SD15-007');
  wire(c, 'sd15-007-flash', 'sd15-007-flash-auto28', 'flash');
  putAbility(c, {
    id: 'sd15-007-flash-auto28', schemaVersion: 2, trigger: source('magicFlash'),
    actions: [
      { type: 'addModifier', property: 'zeroBPExhaustAllZeroBP', value: 1, duration: 'turn', selector: { owner: 'self' } },
      { type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: { type: 'modifyBP', amount: -2000, duration: 'turn' } }
    ]
  });
}

// SD15-008 — draw/reveal Strengthening Spirits + Flash BP reduction.
{
  const c = card('SD15-008');
  wire(c, 'sd15-008-main', 'sd15-008-main-auto28', 'main');
  wire(c, 'sd15-008-flash', 'sd15-008-flash-auto28', 'flash');
  putAbility(c, {
    id: 'sd15-008-main-auto28', schemaVersion: 2, trigger: source('magicMain'),
    actions: [
      { type: 'draw', count: 1 },
      { type: 'revealTopAndRoute', player: 'self', count: 5, matchSelector: { cardTypes: ['spirit'], effectIdIncludes: 'strengthening' }, matchedDestination: 'hand', otherwiseDestination: 'topDeck' }
    ]
  });
  putAbility(c, {
    id: 'sd15-008-flash-auto28', schemaVersion: 2, trigger: source('magicFlash'),
    actions: [{ type: 'selectTarget', selector: { owner: 'any', zones: ['field'], cardTypes: ['spirit'] }, onSelect: { type: 'modifyBP', amount: -3000, duration: 'turn' } }]
  });
}

// Sync SD15 subset back into the aggregate database and standalone mirrors.
const sd15Cards = cards.filter((c) => c.set === 'SD15');
fs.writeFileSync(cardsPath, JSON.stringify(raw, null, 2) + '\n');
fs.writeFileSync(sd15Path, JSON.stringify(sd15Cards, null, 2) + '\n');
fs.writeFileSync(resourceSd15Path, JSON.stringify(sd15Cards, null, 2) + '\n');
console.log(`[batch08] patched ${sd15Cards.length} SD15 cards`);
