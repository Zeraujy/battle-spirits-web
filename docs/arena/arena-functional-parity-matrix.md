# New Arena Functional Parity Matrix

The Legacy Arena remains the functional reference implementation until every player-facing Rules Engine state has a reachable and tested New Arena representation.

Status flow:

`LEGACY_ONLY -> BRIDGED -> VISUALIZED -> INTERACTIVE -> QA_PASSED`

## Critical Integration Block

| Capability | Phase | Status |
| --- | ---: | --- |
| Match Lifecycle | 01 | QA_PASSED |
| End Game Screen | 01 | QA_PASSED |
| Exit Routing | 01 | QA_PASSED |
| Surrender | 01 | QA_PASSED |
| Ultimate Trigger | 02 | QA_PASSED |
| Trigger Counter | 02 | QA_PASSED |
| Critical Hit | 02 | QA_PASSED |
| XU Trigger | 02 | QA_PASSED |
| Effect Decisions | 03 | QA_PASSED |
| Target Selection | 03 | QA_PASSED |
| Multiple Target Selection | 03 | QA_PASSED |
| Yes / No and Option Decisions | 03 | QA_PASSED |
| Effect Order | 03 | QA_PASSED |
| Trigger Order | 03 | QA_PASSED |
| Core Distribution | 03 | QA_PASSED |

## Remaining Roadmap

The authoritative machine-readable status is maintained in:

`src/features/arena-visual/parity/arenaParityRegistry.js`

Remaining phases continue with complete battle timing, card mechanic parity, setup/turn states, online/reconnect states, legacy feedback layers, manual fallback validation, post-match/social parity, full Rules Engine state coverage, scenario parity, release QA and final Legacy Arena retirement.

## Permanent Rule

A feature is not considered migrated merely because the Rules Engine supports it.

It must also be:

1. reachable in the New Arena;
2. understandable to the player;
3. interactive when player input is required;
4. protected against hidden-information leaks;
5. covered by an automated parity gate.

## Phase 04 — Complete Battle Timing UX

Status: `QA_PASSED`

New Arena now presents the authoritative battle stage with attacker/blocker identity, direct-attack state, First/Second Flash timing, priority ownership, resolution cues and visible battle restrictions. Attack/Block input remains drag-based and Rules Engine authoritative.

## Phase 05 — Complete Card Mechanic Parity

Status: `QA_PASSED`

Integrated New Arena representation/routing now covers:

- Magic Main / Flash manual-cost start
- High Speed
- Field Flash
- Brave Combine
- Brave Separate
- Brave Exchange
- Direct Combine
- Burst set / activation / pass
- Mirage manual-cost set and visible Mirage zone
- Mirage card-motion anchoring

The visual layer consumes sanitized legal-action descriptors and never calls the reducer directly.

## Phase 06 — Turn, Setup & Match State Parity

Status: `QA_PASSED`

The New Arena now has an opening setup presenter with first-player information, opening Hand/Life/Reserve/Soul Core state and Mulligan availability sourced from the current legal-action set. Turn authority is visible independently from the Utility Panel, including CPU-thinking and opponent-controlled waiting states.

## Phase 07 — Online, Ranked & Reconnect Parity

Status: `QA_PASSED`

The New Arena now presents socket connection state, server-authoritative status, Custom Match turn clock, reconnect countdowns, opponent reconnect state and server notices/errors. Socket connect/disconnect events are tracked reactively, while the existing Online client remains responsible for automatic `room:resume`.

## Phase 08 — Legacy Feedback & Presentation Restoration

Status: `QA_PASSED`

The New Arena now reuses the proven Legacy Arena presentation layers for phase cues, Burst reveal animation, event toasts, live battle links and targeting hints. These layers remain presentation-only and do not own game-state authority.

## Phase 09 — Manual Tools & Developer-Safe Fallback

Status: `QA_PASSED`

The Manual tab now covers the complete legacy fallback surface used by the simulator:

- Draw 1
- Top Deck → Trash
- Reveal Top
- Life +1 / -1
- Void → Reserve Core
- temporary BP +/-1000
- Refresh / Exhaust
- Destroy
- Return to Hand
- manual movement to Hand / Trash / Deck Top / Deck Bottom
- revealed-card routing to Hand / Deck Top / Deck Bottom
- physical Core / Soul Core correction through the existing click/drag system

A dedicated manual policy now disables fallback tools in Online and Ranked matches, during mandatory pending states, after match completion, or when the local client does not control the current actor. This prevents the Manual tab from bypassing server authority.

## Phase 10 — Post-Match & Social Parity

Status: `QA_PASSED`

The New Arena post-match flow is now split into dedicated statistics, progression and social surfaces. It presents result reason, final turn, duration, remaining Life, deck snapshot, Card Mastery, Ranked RP, rematch/play-again routing, Add Opponent, Open Profile and Main Menu. Social and rematch failures now return player-facing status instead of failing silently.

## Phase 11 — Full Rules Engine State Coverage Audit

Status: `QA_PASSED`

Added a permanent machine-readable state-presentation registry:

`src/features/arena-visual/parity/arenaRulesStatePresentationRegistry.js`

Every tracked Rules Engine state is explicitly classified as either:

- `PRESENTED` — it has a player-facing New Arena representation; or
- `INTERNAL_ONLY` — it is an engine queue/storage state that must not be directly exposed.

The permanent audit checks canonical match-state keys, transient manual states, physical-card states and evidence files. A future player-facing Rules Engine state must be added to this registry and assigned a presenter before parity can remain green.
