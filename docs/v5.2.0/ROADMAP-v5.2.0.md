# Battle Spirits: KAIHOU! Simulator — v5.2.0 Roadmap

## Theme

**Arena Architecture & Battlefield Experience Overhaul**

The release is divided into three blocks so architecture risk and visual risk are never mixed blindly.

## Block A — Architecture Foundation

### Phase 0 — Architecture & Repository Boundary Audit — COMPLETE

- Freeze v5.1.0 FINAL as functional baseline.
- Map Web, Game Engine, Online, Server and Content boundaries.
- Add automated forbidden-dependency audit.
- Document future three-repository readiness.

### Phase 1 — Shared Contract Foundation — COMPLETE

- Define UI-safe game/online presentation contracts.
- Create normalized types/shapes for player, zones, cards, timing and available actions.
- No gameplay behavior changes.

### Phase 2 — Arena Controller Boundary — COMPLETE

- Extract orchestration responsibilities from `Simulator.jsx` behind a dedicated Arena controller layer.
- Presentation components stop importing rule helpers directly.
- Preserve local, CPU and online modes.

### Phase 3 — ArenaViewModel v2 — COMPLETE

- Produce explicit presentation state for both players, zones, cards, targeting, actions and priority.
- Derive visual-only flags centrally.
- Add focused tests for the ViewModel contract.

### Phase 4 — Internal Repository Shape — COMPLETE

- Introduce clean internal domains equivalent to future `web`, `server`, `content` and `shared` repositories without physically splitting Git yet.
- Add stable Arena, Shared and Content public facades.
- Add import-boundary regression checks.

### Phase 5 — Architecture Foundation QA — COMPLETE

- Full v5.1.0 gameplay regression.
- Online/authority regression.
- UI audit.
- Confirm zero semantic gameplay differences.

## Block B — Arena Structural Redesign

### Phase 6 — Spatial Prototype — COMPLETE

- Implement a low-polish Talishar-inspired spatial prototype using Battle Spirits zones.
- Validate 1366×768, 1920×1080 and ultrawide layouts first.

### Phase 7 — Full-Viewport ArenaShell v2 — COMPLETE

- Maximize battlefield area.
- Remove unnecessary chrome and layout waste.

### Phase 8 — Compact Symmetric HUDs

- Opponent top / player bottom.
- Compact identity, Life and critical status presentation.

### Phase 9 — Battlefield Grid v2

- Adaptive unit density.
- Separate Spirit/Ultimate/Brave presentation from Nexus lane.

### Phase 10 — Resource & Zone Rails

- Life, Reserve, Core Trash, Void, Deck, Trash and Burst reorganized around the battlefield edges.

### Phase 11 — Hand Dock v2

- Persistent bottom hand dock.
- Adaptive overlap/fan behavior.
- Strong hover/focus enlargement.

### Phase 12 — Right Utility Rail

- Turn/phase/priority.
- Recent action.
- Log/chat drawer access.
- Secondary actions.

### Phase 13 — Primary Action / Pass Interaction

- Persistent context-aware primary action.
- The action is driven by server/local authoritative available actions, never inferred from presentation.

### Phase 14 — Battle Focus Layout

- Attacker/blocker visual focus.
- De-emphasize unrelated cards without moving the whole Arena.

### Phase 15 — Structural Responsive QA

- Desktop, tablet and mobile structure validation.
- No final polish yet.

## Block C — Visual Polish & Interaction

### Phase 16 — Card Presentation v2

- Field card readability.
- Level/BP/status hierarchy.
- Exhausted/recovered readability.

### Phase 17 — Brave Attachment Presentation v2

- Clear host/Brave relationship.
- Combined state readability without field clutter.

### Phase 18 — Playability & Targeting Language

- Unified playable, selectable, targetable, attackable, blockable and disabled states.

### Phase 19 — Timing / Phase Tracker v2

- Compact normal flow.
- Expanded Attack Step sub-flow only when needed.

### Phase 20 — Card Inspector & Context UI

- Hover/selection preview.
- Touch-friendly inspect behavior.
- Context information that does not cover the battlefield unnecessarily.

### Phase 21 — Motion System Pass

- Draw, summon, move, Trash, Life damage, Burst reveal, Brave attach, exhaust/recover and targeting transitions.

### Phase 22 — Log / Chat / Event Presentation

- Drawer behavior.
- Recent action presentation.
- Event toasts with lower visual noise.

### Phase 23 — Responsive & Touch Final Pass

- Purpose-built mobile/tablet transformations.
- Drag/tap/long-press interaction regression.

### Phase 24 — Performance & Stress QA

- Dense boards.
- Large hands.
- multiple Nexus/Brave states.
- simultaneous animation pressure.

### Phase 25 — v5.2.0 Release QA

- Full gameplay regression.
- Online/reconnect regression.
- Supabase-facing workflow regression.
- Frontend/backend exposure audit.
- Build/release/security audits.
- Patch Notes and final package.

## Physical three-repository split

The physical split into `kaihou-web`, `kaihou-server` and `kaihou-content` is **not** a required v5.2.0 deliverable. It becomes eligible only after Phase 5 proves the internal boundaries. If the split adds deployment risk without practical benefit, a strongly separated monorepo remains acceptable.
