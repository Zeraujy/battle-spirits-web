import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cardsPath = path.join(root, 'src/data/cards.json');
const sd23Path = path.join(root, 'src/data/SD23.json');
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

// SD23-001 — opponent-caused destruction + Fairy name predicate.
{
  const c = card('SD23-001');
  wire(c, 'sd23-001-destroyed', 'sd23-001-destroyed-auto26', 'whenDestroyed');
  putAbility(c, {
    id: 'sd23-001-destroyed-auto26', schemaVersion: 2, trigger: source('whenDestroyed'), levels: [1,2],
    conditions: [
      { type: 'eventDestroyedByOpponent' },
      { type: 'fieldCount', selector: { owner: 'self', zones: ['field'], cardTypes: ['spirit'], nameIncludes: 'Fairy' }, atLeast: 1 }
    ],
    actions: [{ type: 'draw', count: 2 }]
  });
}

// SD23-002 — battle-resolution reveal routing.
{
  const c = card('SD23-002');
  wire(c, 'sd23-002-battle', 'sd23-002-battle-auto26', 'afterBattleResolution');
  putAbility(c, {
    id: 'sd23-002-battle-auto26', schemaVersion: 2, trigger: source('afterBattleResolution'), levels: [2],
    conditions: [{ type: 'fieldCount', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'], battleOpponentOfSource: true, maximumBP: 3000 }, atLeast: 1 }],
    actions: [{ type: 'chooseYesNo', titleEN: 'Reveal the top card?', titlePT: 'Revelar a carta do topo?', yesActions: [
      { type: 'revealTopAndRoute', player: 'self', count: 1, matchSelector: { cardTypes: ['ultimate'], colors: ['yellow'] }, matchedDestination: 'hand', otherwiseDestination: 'trash' }
    ] }]
  });
}

// SD23-003 — BP reduction + once-per-turn zero-BP draw.
{
  const c = card('SD23-003');
  wire(c, 'sd23-003-attack', 'sd23-003-attack-auto26');
  putAbility(c, {
    id: 'sd23-003-attack-auto26', schemaVersion: 2, trigger: source('whenAttacks'), levels: [2,3],
    actions: [{ type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: [
      { type: 'modifyBP', amount: -3000, duration: 'battle' },
      { type: 'conditional', condition: { type: 'selectedTargetBP', atMost: 0 }, actions: [
        { type: 'oncePerTurn', key: 'zero-bp-draw', actions: [{ type: 'draw', count: 1 }] }
      ] }
    ] }]
  });
}

// SD23-005 — BP reduction followed by destruction at 0 BP.
{
  const c = card('SD23-005');
  wire(c, 'sd23-005-attack', 'sd23-005-attack-auto26');
  putAbility(c, {
    id: 'sd23-005-attack-auto26', schemaVersion: 2, trigger: source('whenAttacks'), levels: [1,2,3],
    actions: [{ type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: [
      { type: 'modifyBP', amount: -3000, duration: 'battle' },
      { type: 'conditional', condition: { type: 'selectedTargetBP', atMost: 0 }, actions: [{ type: 'destroy' }] }
    ] }]
  });
}

// SD23-006 — battle-resolution life protection + Core gain.
{
  const c = card('SD23-006');
  wire(c, 'sd23-006-life-protection', 'sd23-006-life-auto26', 'beforeBattleResolution');
  wire(c, 'sd23-006-core', 'sd23-006-core-auto26', 'beforeBattleResolution');
  const opponentBattler = { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'], battleOpponentOfSource: true, maximumBP: 3000 };
  putAbility(c, {
    id: 'sd23-006-life-auto26', schemaVersion: 2, trigger: source('beforeBattleResolution'), levels: [1,2],
    conditions: [{ type: 'activePlayer', player: 'opponent' }, { type: 'fieldCount', selector: opponentBattler, atLeast: 1 }],
    actions: [{ type: 'setBattleRestriction', restriction: { preventLifeDamage: true } }]
  });
  putAbility(c, {
    id: 'sd23-006-core-auto26', schemaVersion: 2, trigger: source('beforeBattleResolution'), levels: [2],
    conditions: [{ type: 'fieldCount', selector: opponentBattler, atLeast: 1 }],
    actions: [{ type: 'addCoreToReserveFromVoid', count: 1 }]
  });
}

// SD23-007 — attack BP reduction + battle-resolution destruction.
{
  const c = card('SD23-007');
  wire(c, 'sd23-007-attack', 'sd23-007-attack-auto26');
  wire(c, 'sd23-007-battle-destroy', 'sd23-007-battle-auto26', 'beforeBattleResolution');
  putAbility(c, {
    id: 'sd23-007-attack-auto26', schemaVersion: 2, trigger: source('whenAttacks'), levels: [1,2,3],
    actions: [{ type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: { type: 'modifyBP', amount: -5000, duration: 'battle' } }]
  });
  putAbility(c, {
    id: 'sd23-007-battle-auto26', schemaVersion: 2, trigger: source('beforeBattleResolution'), levels: [2,3],
    conditions: [{ type: 'fieldCount', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'], battleOpponentOfSource: true, maximumBP: 3000 }, atLeast: 1 }],
    actions: [{ type: 'destroy', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'], battleOpponentOfSource: true } }]
  });
}

// SD23-008 — executable Ultimate Trigger HIT + blocked rider.
{
  const c = card('SD23-008');
  const e = effect(c, 'sd23-008-trigger');
  e.onHitOperations = [
    { type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: { type: 'modifyBP', amount: -5000, duration: 'battle' } },
    { type: 'setBattleRestriction', restriction: { ultimateTriggerHitResolved: true } }
  ];
  putAbility(c, {
    id: 'sd23-008-blocked-auto26', schemaVersion: 2, trigger: source('whenBlocked'), levels: [3,4,5],
    conditions: [{ type: 'battleRestriction', key: 'ultimateTriggerHitResolved' }, { type: 'battleBlockerCardType', cardType: 'spirit' }],
    actions: [{ type: 'moveLifeToReserve', player: 'opponent', count: 1 }]
  });
}

// SD23-009 — Magic battle-cost reduction + executable Trigger HIT/blocked rider.
{
  const c = card('SD23-009');
  wire(c, 'sd23-009-magic-cost', 'sd23-009-magic-cost-auto26');
  putAbility(c, {
    id: 'sd23-009-magic-cost-auto26', schemaVersion: 2, trigger: source('whenBattles'), levels: [3,4],
    actions: [{ type: 'modifyCost', amount: -1, duration: 'battle', selector: { owner: 'self', cardTypes: ['magic'] } }]
  });
  const e = effect(c, 'sd23-009-trigger');
  e.onHitOperations = [
    { type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: { type: 'modifyBP', amount: -10000, duration: 'battle' } },
    { type: 'setBattleRestriction', restriction: { ultimateTriggerHitResolved: true } }
  ];
  putAbility(c, {
    id: 'sd23-009-blocked-auto26', schemaVersion: 2, trigger: source('whenBlocked'), levels: [3,4],
    conditions: [{ type: 'battleRestriction', key: 'ultimateTriggerHitResolved' }, { type: 'battleBlockerCardType', cardType: 'spirit' }],
    actions: [{ type: 'moveLifeToReserve', player: 'opponent', count: 1 }]
  });
}

// SD23-010 — Trigger destruction at 0 BP + Brilliance Magic recovery.
{
  const c = card('SD23-010');
  const e = effect(c, 'sd23-010-trigger');
  e.onHitOperations = [{ type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: [
    { type: 'modifyBP', amount: -10000, duration: 'battle' },
    { type: 'conditional', condition: { type: 'selectedTargetBP', atMost: 0 }, actions: [{ type: 'destroy' }] }
  ] }];
  wire(c, 'sd23-010-brilliance', 'sd23-010-brilliance-auto26', 'afterBattleResolution');
  putAbility(c, {
    id: 'sd23-010-brilliance-auto26', schemaVersion: 2, trigger: source('afterBattleResolution'), levels: [5],
    conditions: [{ type: 'battleSourceRole', role: 'attacker' }],
    actions: [{ type: 'returnMagicUsedThisBattle', player: 'self' }]
  });
}

// SD23-011 — opponent move observer + once-per-turn 0-BP battle observer.
{
  const c = card('SD23-011');
  wire(c, 'sd23-011-life', 'sd23-011-life-auto26', 'cardMoved');
  wire(c, 'sd23-011-draw', 'sd23-011-draw-auto26', 'bpBecameZero');
  putAbility(c, {
    id: 'sd23-011-life-auto26', schemaVersion: 2, trigger: controllerField('cardMoved'), levels: [1,2],
    conditions: [
      { type: 'eventMovedByOpponent' },
      { type: 'eventMovedCardFamily', family: 'Divine Spirit' },
      { type: 'eventMovedFromZone', values: ['spirits'] },
      { type: 'eventMoveDestination', values: ['hand','topDeck','bottomDeck','deck'] },
      { type: 'eventMovedByCardType', cardTypes: ['spirit','magic'] }
    ],
    actions: [{ type: 'healLife', count: 1 }]
  });
  putAbility(c, {
    id: 'sd23-011-draw-auto26', schemaVersion: 2, trigger: controllerField('bpBecameZero'), levels: [2],
    conditions: [{ type: 'eventZeroedIsBattleOpponent' }],
    actions: [{ type: 'oncePerTurn', key: 'opposing-battler-zero-draw', actions: [{ type: 'draw', count: 1 }] }]
  });
}

// SD23-012 — Flash BP reduction + opponent-turn refresh rider.
{
  const c = card('SD23-012');
  wire(c, 'sd23-012-flash', 'sd23-012-flash-auto26', 'magicFlash');
  putAbility(c, {
    id: 'sd23-012-flash-auto26', schemaVersion: 2, trigger: source('magicFlash'), actions: [
      { type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: { type: 'modifyBP', amount: -2000, duration: 'turn' } },
      { type: 'conditional', condition: { type: 'activePlayer', player: 'opponent' }, actions: [
        { type: 'selectTarget', selector: { owner: 'self', zones: ['field'], cardTypes: ['spirit'], colors: ['yellow'] }, allowZero: true, onSelect: { type: 'refresh' } }
      ] }
    ]
  });
}

// SD23-013 — Burst recovery + optional paid Flash + deferred Attack Step end.
{
  const c = card('SD23-013');
  wire(c, 'sd23-013-burst', 'sd23-013-burst-auto26', 'burstOwnSpiritDestroyed');
  wire(c, 'sd23-013-flash', 'sd23-013-flash-auto26', 'magicFlash');
  putAbility(c, {
    id: 'sd23-013-burst-auto26', schemaVersion: 2, trigger: source('burstOwnSpiritDestroyed'), actions: [
      { type: 'selectTrashTarget', selector: { owner: 'self', zones: ['trash'], cardTypes: ['spirit'], maximumCost: 5, instanceIdFromContext: 'burstSourceInstanceId' }, allowZero: true, onSelect: { type: 'returnToHand' } },
      { type: 'chooseYesNo', titleEN: 'Activate Flash?', titlePT: 'Ativar Flash?', yesActions: [
        { type: 'paySourceCost', actions: [{ type: 'dispatchSourceEvent', event: 'magicFlash' }] }
      ] }
    ]
  });
  putAbility(c, {
    id: 'sd23-013-flash-auto26', schemaVersion: 2, trigger: source('magicFlash'),
    conditions: [{ type: 'ownLifeAtMost', value: 2 }],
    actions: [{ type: 'scheduleAttackStepEndAfterBattle' }]
  });
}

// SD23-014 — life-cost protection + optional paid Flash blanking.
{
  const c = card('SD23-014');
  wire(c, 'sd23-014-burst', 'sd23-014-burst-auto26', 'burstLifeDecrease');
  wire(c, 'sd23-014-flash', 'sd23-014-flash-auto26', 'magicFlash');
  putAbility(c, {
    id: 'sd23-014-burst-auto26', schemaVersion: 2, trigger: source('burstLifeDecrease'), actions: [
      { type: 'setTurnProtection', player: 'self', protection: { type: 'blockSpiritAttackLifeDamageByCosts', costs: [0,1,3,5,7,9,11] } },
      { type: 'chooseYesNo', titleEN: 'Activate Flash?', titlePT: 'Ativar Flash?', yesActions: [
        { type: 'paySourceCost', actions: [{ type: 'dispatchSourceEvent', event: 'magicFlash' }] }
      ] }
    ]
  });
  putAbility(c, {
    id: 'sd23-014-flash-auto26', schemaVersion: 2, trigger: source('magicFlash'), actions: [
      { type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit'] }, allowZero: true, onSelect: [
        { type: 'addModifier', property: 'cannotAttack', value: 1, duration: 'turn', selector: { selectedTarget: true } },
        { type: 'addModifier', property: 'cannotBlock', value: 1, duration: 'turn', selector: { selectedTarget: true } },
        { type: 'addModifier', property: 'effectsDisabled', value: 1, duration: 'turn', selector: { selectedTarget: true } }
      ] }
    ]
  });
}

// SD23-015 — Flash BP reduction and 0-BP destruction.
{
  const c = card('SD23-015');
  wire(c, 'sd23-015-flash', 'sd23-015-flash-auto26', 'magicFlash');
  putAbility(c, {
    id: 'sd23-015-flash-auto26', schemaVersion: 2, trigger: source('magicFlash'), actions: [
      { type: 'selectTarget', selector: { owner: 'opponent', zones: ['field'], cardTypes: ['spirit','ultimate'] }, allowZero: true, onSelect: [
        { type: 'modifyBP', amount: -5000, duration: 'turn' },
        { type: 'conditional', condition: { type: 'selectedTargetBP', atMost: 0 }, actions: [{ type: 'destroy' }] }
      ] }
    ]
  });
}

// SD23-016 — opponent-turn only exhaustion-state inversion.
{
  const c = card('SD23-016');
  wire(c, 'sd23-016-flash', 'sd23-016-flash-auto26', 'magicFlash');
  putAbility(c, {
    id: 'sd23-016-flash-auto26', schemaVersion: 2, trigger: source('magicFlash'),
    conditions: [{ type: 'activePlayer', player: 'opponent' }],
    actions: [{ type: 'swapExhaustionState', selector: { owner: 'any', zones: ['field'], cardTypes: ['spirit'] } }]
  });
}

// SD23-X01 — battle effect targets both Spirits and Ultimates.
{
  const c = card('SD23-X01');
  const a = c.abilities.find((x) => x.id === 'sd23-x01-battle-auto23');
  if (a?.actions?.[0]?.selector) a.actions[0].selector.cardTypes = ['spirit','ultimate'];
}

fs.writeFileSync(cardsPath, JSON.stringify(raw, null, 2) + '\n');

// Keep the set-scoped runtime data aligned with the merged catalog when possible.
if (fs.existsSync(sd23Path)) {
  const sdRaw = JSON.parse(fs.readFileSync(sd23Path, 'utf8'));
  const sdCards = Array.isArray(sdRaw) ? sdRaw : sdRaw.cards;
  if (Array.isArray(sdCards)) {
    for (let i = 0; i < sdCards.length; i += 1) {
      const id = sdCards[i]?.id;
      const replacement = cards.find((c) => c.id === id);
      if (replacement) sdCards[i] = structuredClone(replacement);
    }
    fs.writeFileSync(sd23Path, JSON.stringify(sdRaw, null, 2) + '\n');
  }
}

console.log('Batch 06 SD23 migration patch applied.');
