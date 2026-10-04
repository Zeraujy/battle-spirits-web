# Arena Redesign

The Arena redesign is being developed in parallel with the current v5.1.0 Arena.

## Safety boundary

The current `src/features/arena/Simulator.jsx` remains the production Arena. The redesign lives under `src/features/arena-redesign/` and is not connected to the production route during the foundation block.

The redesign must consume presentation data through `createArenaRedesignViewModel()` instead of reading or mutating game-engine state directly.

## Foundation status

- Foundation 00 — parallel Arena root and isolated feature boundary: complete.
- Foundation 01 — presentation View Model and hidden-information protection: complete.
- Foundation 02 — full-screen Arena surface with player, opponent, center and utility regions: complete.
- Foundation 03 — playmat registry, resolver and built-in default playmat: complete.

## Playmat contract

Playmats are cosmetic presentation assets. They do not affect rules, card legality, match state or online authority.

The built-in default playmat uses:

`/images/arena/wallpaper_arena_default.png`

Future store-owned playmats can be added to the registry without changing Arena game-state contracts.

## Naming policy

Folders and non-component files use lowercase English kebab-case. React component files use English PascalCase.

## Phase 04 — Player and Opponent Field Layout

The parallel Arena now has a shared mirrored side layout for both players. Each side is composed of a primary resource rail, a central battlefield/hand surface, and a secondary deck/trash rail. The opponent side mirrors the player's spatial arrangement without duplicating gameplay logic.

## Phase 05 — Zone Components

The redesign now has presentation-only components for Life, Burst, Reserve, Deck, Trash, Core Trash, Void, Hand, and Battlefield. These components consume only the Arena Redesign View Model and remain disconnected from the production Simulator route.

## Phase 06 — New Core Presentation

The user-provided Core and Soul Core artwork is now stored as canonical redesign assets under `public/assets/game-resources/`. `CoreToken`, `CorePool`, and `CoreResourceZone` provide the visual foundation for Life, Reserve, and Core Trash. Interaction behavior remains deferred to later phases so the current v5.1.0 rules engine stays untouched.

## Phase 07 — Reserve / Life Core Interaction

The redesign now exposes a controller-owned Core interaction bridge for Reserve, Core Trash, and Cores placed on field cards. Core clicks and drag/drop emit the same authority-facing payload shape already used by the current simulator (`playerId`, source zone, optional card instance, Core type and token index), while the redesign itself never applies a rules action.

Life remains presentation-only for manual interaction because v5.1.0 does not allow arbitrary Life Core movement. Life changes continue to be resolved by the existing rules engine.

## Phase 08 — Card Field Presentation

Battlefield placeholders were replaced by official card artwork resolved through the card service. Field cards now present current Level, BP, exhaustion, pending-destruction state, attacker/blocker role, Brave attachment marker, and their Core pool without placing status overlays over the artwork.

Field density is adaptive: up to three cards use the large presentation, four to six use medium density, and seven or more use compact density. This scaling changes presentation only and never removes cards from the field view.

## Phase 09 — Hand System

The player Hand now renders official card artwork in a responsive fan layout, while the opponent Hand remains card-back only and keeps card identity hidden. Fan density compresses progressively for larger hands without removing cards.

Player cards support controller-owned visual selection plus both native drag/drop and an optional pointer-down bridge for the existing touch/pointer drag controller. Dropping a Hand card on the player Battlefield emits an interaction intent through `onHandCardDrop`; the redesign does not summon, pay, validate, or mutate game state by itself.

Optional `playableHandInstanceIds` presentation data can dim cards that the existing controller already knows are unavailable. This is presentation-only and does not reproduce legality rules in the redesign.

## Phase 10 — Card Selection and Playability Feedback

The redesign now derives presentation-only interaction hints from controller-provided legal actions and the current pending effect decision. Hand cards can be visually distinguished as playable or unavailable without duplicating summon, Magic, Burst, Mirage, or timing rules inside React components.

Contextual target selection is shared across both player and opponent fields. Candidate cards receive a non-obstructive outline, selected targets receive a stronger border treatment, and non-candidates are subdued while a target decision is active. Hand-card target decisions are supported by the same bridge for effects that explicitly choose cards from Hand.

The View Model keeps this layer declarative: it exposes normalized action identifiers, action labels, target candidates and target metadata, while the controller remains responsible for dispatching the selected action. The redesign never calls the rules engine directly.

Phase 10 interaction CSS intentionally avoids pseudo-element overlays and new stacking contexts over card artwork. Visual feedback uses borders, outlines, opacity and compact status text outside the card image.

## Phase 11 — Battle Interaction Layer

The parallel Arena now presents the active battle in the center field without moving either player's Battlefield layout. `BattleFocus` shows the current attacker and either the declared blocker or the defending Life target, while `AttackConnector` makes the relationship readable without becoming a gameplay authority.

`BattleStatus` reflects the existing battle stage and safe priority context from the Arena View Model. `TargetingLayer` summarizes an active target-selection prompt, and `TargetMarker` reuses the Phase 10 targetability state directly on field cards without covering card artwork.

The entire Phase 11 layer remains presentation-only. Attack declaration, blocker legality, Flash priority, direct-attack resolution, target validation and battle resolution continue to be decided by the existing controller and Rules Engine. No Phase 11 React component imports or calls gameplay authority modules.


## Phase 12 — Right Utility Panel
The right-side utility region now consolidates turn status, phase tracking, contextual global actions, recent action, game log and Arena chat while preserving controller authority.

## Phase 13 — Burst, Flash and Effect Resolution UX

The parallel Arena now has a dedicated presentation layer for Burst opportunities, Flash Timing, pending effect resolution, target-selection prompts and structured choices. The layer reads only the sanitized Arena View Model and legal action descriptors already supplied by the controller.

`BurstRevealOverlay` exposes the current Burst window and controller-owned Activate/Pass requests. `FlashWindow` reflects authoritative Flash priority and offers Pass only when the legal action exists, while legal Magic, High Speed and field Flash cards continue to be highlighted by the existing interaction layer instead of being duplicated as global controls.

`EffectResolutionPanel`, `TargetSelectionPrompt` and `ChoicePrompt` make pending Effect Engine decisions readable without implementing target legality or effect execution in React. The View Model now strips action bodies, continuation data and engine context from pending decisions before they reach the presentation tree.

All Phase 13 controls emit `onEffectActionRequest(action, context)` and never call the Rules Engine directly.

## Phase 14 — Responsive and Touch Adaptation

The parallel Arena now exposes five presentation profiles aligned with the official reference sizes: Desktop Wide (2560×1440), Desktop (1920×1080), Laptop (1366×768), Tablet Landscape (1024×768) and Mobile Landscape (~844×390).

Primary play content remains prioritized while secondary zones progressively compact instead of disappearing. At mobile-landscape size the utility panel reserves a narrow right column rather than overlaying the play surface. Coarse-pointer devices receive larger touch targets, hover-independent feedback and a Pointer Events Hand drag bridge that reuses the existing `onHandCardDrop` controller intent. React still never validates or resolves gameplay actions.


## Phase 15 — Release QA

The original Arena redesign roadmap is closed with permanent release audits covering layout, zones, card visibility, Core presentation, interactions, Playmats, responsive behavior and the aggregate release gate. The redesign remains parallel to production.
