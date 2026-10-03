import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { getEffectiveBP } from '../selectors.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { resolveActionList } from './actionResolver.js';
import { calculateReduction } from '../cost.js';

const rawCards = JSON.parse(fs.readFileSync(new URL('../../data/cards.json', import.meta.url), 'utf8'));
const normalized = rawCards.map(normalizeCard);
const index = makeCardIndex(normalized);
const byId = new Map(normalized.map((c) => [String(c.id), c]));
const deck = Array.from({ length: 40 }, () => 'BS13-001');
const ability = (cardId, id) => byId.get(cardId)?.abilities?.find((a) => a.id === id);
function base(){ const m=createMatch({player1:{name:'A',deck},player2:{name:'B',deck},firstPlayerId:'player1',cardIndex:index,random:()=>0.25}); m.phase='attack'; m.activePlayerId='player1'; m.players.player1.reserve=20; m.players.player2.reserve=20; return m; }
function physical(cardId, instanceId, cores=1){ return {...makePhysicalCard(cardId,index),instanceId,cores:{regular:cores,soul:false},exhausted:false}; }

test('content batch 10: BS13 Wave 2 resolves ten more cards and leaves 50 pending',()=>{
  const coverage=JSON.parse(fs.readFileSync(new URL('../../../data/effects/history/effect-coverage-v5.1.0-content-batch10.json',import.meta.url),'utf8'));
  const rows=coverage.cards.filter(x=>x.set==='BS13');
  assert.equal(rows.length,90);
  assert.equal(rows.filter(x=>x.status==='UNSTRUCTURED_TEXT').length,50);
  assert.equal(rows.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,40);
});

test('content batch 10: Dragonaga Curse and colorless attack are structured',()=>{
  assert.equal(ability('BS13-011','bs13-011-curse-trigger-auto30').trigger.event,'afterBattleResolution');
  assert.equal(ability('BS13-011','bs13-011-colorless-auto30').actions[0].property,'colors');
});

test('content batch 10: Kigna-Swan installs a reusable three-card deck-discard cap',()=>{
  assert.equal(ability('BS13-026','bs13-026-deck-cap-self-auto30').actions[0].property,'maxDeckDiscardPerTurn');
  assert.equal(ability('BS13-026','bs13-026-deck-cap-opponent-auto30').actions[0].selector.owner,'opponent');
});

test('content batch 10: Och locks exact printed costs and grants Angel reduction',()=>{
  assert.equal(ability('BS13-035','bs13-035-lock-4-auto30').actions[0].property,'cannotAttack');
  assert.deepEqual(ability('BS13-035','bs13-035-angel-reduction-auto30').actions[0].value,['yellow']);
});

test('content batch 10: Orphe blocks opponent Trash-to-hand recovery',()=>{
  assert.equal(ability('BS13-044','bs13-044-trash-lock-auto30').actions[0].property,'trashToHandBlocked');
});

test('content batch 10: Iason deck discard scales by Ancient Battleship Nexuses and caps at eight',()=>{
  const a=ability('BS13-045','bs13-045-battle-auto30').actions[0];
  assert.equal(a.type,'topDeckToTrash'); assert.equal(a.countMultiplier,2); assert.equal(a.maxCount,8);
});

test('content batch 10: Shield-Dragon Mk-II uses combined Heavy Armor',()=>{
  assert.deepEqual(ability('BS13-055','bs13-055-heavy-armor-auto30').actions[0].value,['green','white','yellow']);
});

test('content batch 10: Coronation Volcano BP bonus scales from current Life',()=>{
  let match=base(); const nexus=physical('BS13-061','volcano',2); const atk=physical('BS13-008','terra',1);
  match.players.player1.field.nexuses=[nexus]; match.players.player1.field.spirits=[atk];
  const before=getEffectiveBP(match,index,atk);
  const r=dispatchEffectEvent(match,{event:'whenAttacks',sourcePlayerId:'player1',sourceInstanceId:'terra',eventPlayerId:'player1'},index);
  const current=r.match.players.player1.field.spirits.find(x=>x.instanceId==='terra');
  assert.equal(getEffectiveBP(r.match,index,current),before+r.match.players.player1.life*1000);
});

test('content batch 10: Shining Galaxy overrides Astral Deity printed cost to five',()=>{
  let match=base(); const nexus=physical('BS13-062','galaxy',2); match.players.player1.field.nexuses=[nexus];
  match=dispatchEffectEvent(match,{event:'continuous',sourcePlayerId:'player1',sourceInstanceId:'galaxy',eventPlayerId:'player1'},index).match;
  const target=byId.get('BS13-040');
  assert.equal(calculateReduction(match,'player1',target,index).effectivePrinted,5);
});

test('content batch 10: Zodiac Conduct has structured Main reveal/summon and Flash BP routes',()=>{
  const main=ability('BS13-074','bs13-074-main-auto30'); const flash=ability('BS13-074','bs13-074-flash-auto30');
  assert.equal(main.actions[0].type,'revealTop'); assert.equal(main.actions[0].count,4);
  assert.equal(main.actions[1].afterSelect[0].type,'specialSummonFromHand');
  assert.equal(flash.actions[0].onSelect.type,'modifyBP');
});
