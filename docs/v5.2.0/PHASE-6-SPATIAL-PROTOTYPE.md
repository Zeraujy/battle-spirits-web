# v5.2.0 — Phase 6: Spatial Prototype

## Goal

Establish the first visible structural version of the new Arena using the spatial principles documented from the current Talishar reference, while preserving Battle Spirits terminology, rules and KAIHOU's own identity.

This is deliberately a **low-polish** phase. It validates geometry and viewport allocation before HUD, card, zone and interaction redesigns are layered on top.

## Implemented structure

### Battlefield-first desktop composition

Desktop now uses two persistent structural columns:

```text
┌──────────────────────────────────────────────────┬───────────────┐
│                  BATTLEFIELD                     │ Utility rail  │
│                                                  │               │
│ Opponent status / hand                           │ Turn / phase  │
│ Opponent battlefield                             │ Controls      │
│ Battle / timing focus                            │ Secondary UI  │
│ Player battlefield                               │               │
│ Player hand dock                                 │               │
│ Player status                                    │               │
└──────────────────────────────────────────────────┴───────────────┘
```

The battlefield owns the majority of the viewport. The right rail is intentionally narrow and subordinate to cards.

### Selected-card inspector overlay

The selected-card inspector no longer permanently consumes a third desktop column. When opened it floats over the left edge of the battlefield.

This is presentation-only. It does not change selection logic or legal-action authority.

### Explicit spatial regions

The existing Arena composition now exposes stable presentation markers for:

- opponent status;
- opponent hand;
- opponent battlefield;
- battle/timing focus;
- player battlefield;
- player hand;
- player status;
- utility rail.

These are spatial/presentation markers only and contain no rules logic.

### Hand allocation

The local hand receives a dedicated bottom band instead of competing dynamically with permanent battlefield rows. The opponent hand remains a smaller top band.

Phase 11 owns the final Hand Dock v2 behavior; Phase 6 only establishes its viewport allocation.

## Target resolutions

Phase 6 contains explicit structural breakpoints for:

- **1366×768 class** — compact utility rail and reduced hand heights while preserving two permanent battlefield bands;
- **1920×1080 class** — normal desktop allocation;
- **ultrawide / large desktop** — extra pixels are spent on cards and the battlefield rather than chrome;
- **<1180 px fallback** — utility rail collapses so the battlefield remains usable until the dedicated Phase 15 responsive pass.

## Files

- `src/styles/arena/spatialPrototypeV520.css`
- `src/components/game/arena/ArenaShell.jsx`
- `src/components/game/arena/PlayerField.jsx`
- `src/components/game/arena/OpponentField.jsx`
- `src/components/game/arena/CenterField.jsx`
- `src/pages/Simulator.jsx`
- `scripts/audit-arena-spatial-prototype-v520-phase6.mjs`

## Guardrails preserved

- no Game Engine rule changes;
- no Effect Engine changes;
- no Online protocol/server authority changes;
- no Supabase changes;
- no `public/` asset changes;
- no card database changes;
- presentation components do not decide legal actions.

## Result

**Phase 6 status: PASS.**

The Arena now has a battlefield-first spatial skeleton suitable for the Full-Viewport ArenaShell v2 work in Phase 7.
