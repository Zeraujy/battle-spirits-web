# v5.1.0 Content Migration — Batch 04

## Goal
Close SD13 completely and use the reusable engine work to advance SD10 without card-ID-specific reducer hacks.

## SD13 result
- 18/18 runtime cards are `AUTOMATED` or `NO_EFFECT`.
- Status: `READY_NO_MANUAL`.
- SD13 joins SD17, SD19 and SD20 as fully automated Starter Deck sets.

## SD13 migrated content
- `BS01-125` Deadly Balance — own Spirit destruction followed by an opponent-authored Spirit choice.
- `BS06-023` The DarkBishop Baculus — trims all Spirits to exactly one Core while preserving Soul Core where applicable.
- `BS09-015` The JailBeast Gashabers — conditional Draw Step draw and Lv3 Yellow Spirit recovery from Trash.
- `BS11-051` Evil-Fisher — reveal/choice flow and existing combined attack automation linked to the display effect.
- `BS11-075` Totentanz — discard-as-cost followed by Core removal from an opposing Spirit.
- `BS12-063` The Brigade's Skyscraper — deploy automation plus Zombie attack observer.
- `SD13-002` Bone-Cat — retaliates against the actual opposing Spirit effect source.
- `SD13-X01` The WickedDragonKing Cursedragon — multi-target summon destruction/draw and attack Core removal.

## SD10 progress
SD10 improves from 55.6% at the start of Batch 04 to 88.9% (16/18 cards automated/no-effect).

Structured or completed in this batch:
- `SD10-008` Charge-aware +2000 BP Attack Step aura.
- `SD10-010` +2000 BP per active Charge Spirit and Lv3 specified attack.
- `SD10-011` Combine Condition requiring an active Charge Spirit.
- `SD10-012` Astral Dragon Attack Step aura and effect-destruction draw observer.
- `SD10-013` retaliation after Life loss from a Spirit attack plus Charge-destruction Nexus removal.
- `SD10-X02` Cost 5+ Combine Condition, Charge inheritance and summon destruction with draw-per-destroyed target.

Remaining SD10 gaps:
- `SD10-015` Fire Wall — destroy a Red Spirit, then end the Attack Step after the battle.
- `SD10-X01` — summon one Red Brave from hand without paying its cost.

These two remain explicit instead of being approximated because both require broader reusable timing/special-summon semantics.

## Reusable engine work
- Level-aware keyword evaluation for targeting and modifiers.
- Keyword-based Brave Combine Conditions.
- Dynamic BP amounts based on matching cards.
- Opponent-authored structured decisions.
- `trimCoresOnMatching` generic action.
- Dynamic battle-attacker targeting and conditions.
- Destruction-source keyword matching.
- Deferred canonical events after player-resolved decisions.

## Coverage movement
- Set gate: 3/11 -> 4/11 sets at >=95%.
- Manual fallback: 74.79% (273/365) -> 70.96% (259/365).
- Phase 24 generated regression scenarios: 92 -> 106.
