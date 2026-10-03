import fs from 'node:fs';
import path from 'node:path';
import { PREBUILT_DECKS } from '../../src/data/prebuiltDecks.js';

const root = process.cwd();
const cards = JSON.parse(fs.readFileSync(path.join(root,'src/data/cards.json'),'utf8'));
const coverage = JSON.parse(fs.readFileSync(path.join(root,'data/effects/coverage.json'),'utf8'));
const runtime = new Set(cards.map(c=>String(c.id)));
const cov = new Map(coverage.cards.map(c=>[String(c.cardId),c]));
const okStatuses = new Set(['AUTOMATED','NO_EFFECT']);
const decks = PREBUILT_DECKS.map(deck=>{
  const ids=[...new Set(deck.cards.map(x=>String(x.cardId)))];
  const missingRuntime=ids.filter(id=>!runtime.has(id));
  const unresolved=ids.filter(id=>runtime.has(id) && !okStatuses.has(cov.get(id)?.status));
  const readyWithoutManual=missingRuntime.length===0 && unresolved.length===0;
  return {id:deck.id,setCode:deck.setCode,title:deck.title,uniqueCards:ids.length,missingRuntime,unresolved,readyWithoutManual,status:readyWithoutManual?'READY_NO_MANUAL':missingRuntime.length?'BLOCKED_MISSING_RUNTIME_DATA':'NEEDS_MIGRATION'};
});
const out={generatedAt:new Date().toISOString(),starterDecks:decks.length,ready:decks.filter(d=>d.readyWithoutManual).length,decks};
fs.mkdirSync(path.join(root,'data/effect-migrations'),{recursive:true});
fs.mkdirSync(path.join(root,'docs/effects'),{recursive:true});
fs.writeFileSync(path.join(root,'data/effects/migrations/starter-deck-priority.json'),JSON.stringify(out,null,2)+'\n');
const lines=['# Starter Deck Priority Pass — Phase 22','',`Starter Deck recipes audited: ${decks.length}`,`Ready without Manual Resolution: ${out.ready}`,'','| Deck | Set | Runtime | Manual | Status |','|---|---|---:|---:|---|'];
for(const d of decks) lines.push(`| ${d.title} | ${d.setCode} | ${d.uniqueCards-d.missingRuntime.length}/${d.uniqueCards} | ${d.unresolved.length} | ${d.status} |`);
lines.push('','## Data gate','','`BLOCKED_MISSING_RUNTIME_DATA` means the Shop recipe exists, but one or more recipe card IDs do not yet have complete runtime gameplay records in `src/data/cards.json`. The pipeline deliberately refuses to label those decks automated.');
fs.writeFileSync(path.join(root,'docs/effects/starter-deck-priority-pass.md'),lines.join('\n')+'\n');
const sd19=decks.find(d=>d.setCode==='SD19');
if(!sd19?.readyWithoutManual){console.error('[phase22] SD19 is not ready without manual resolution',sd19); process.exit(1);}
console.log(`[phase22] ${out.ready}/${decks.length} Starter Deck recipes ready without Manual Resolution.`);
for(const d of decks) console.log(`${d.setCode} ${d.title}: ${d.status}${d.missingRuntime.length?` (missing ${d.missingRuntime.length})`:''}${d.unresolved.length?` (unresolved ${d.unresolved.length})`:''}`);
