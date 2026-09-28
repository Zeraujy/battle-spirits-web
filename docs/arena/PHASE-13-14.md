# Arena UX/UI Overhaul — Phase 13/14

## Scope

This block implements presentation-only targeting feedback and the first independent card motion layer.

### Phase 13 — Targeting UX

New component:

- `TargetingUX`

Visual targeting state is derived exclusively from existing gameplay truth:

- pending effect candidates (`effectCandidateIds`)
- legal blockers returned by the existing Rules Engine (`legalBlockers`)
- the already-derived direct Life target during combat

Normalized presentation states:

- `targetable`
- `selected`
- `unavailable`

No target legality is calculated by `TargetingUX`.

## Phase 14 — CardMotionLayer

New component:

- `CardMotionLayer`

The layer observes already-rendered card locations and creates short-lived visual ghosts when an existing physical card changes zone.

Architecture rule:

1. Game State updates first.
2. React renders the new canonical card location.
3. `CardMotionLayer` measures the new DOM position.
4. A visual ghost animates from the previously cached position to the new position.
5. The ghost is discarded.

Animations never gate dispatch, reducer resolution, online synchronization, or card-zone ownership.

The initial implementation covers generic movement between DOM-addressable zones such as hand, field, burst, trash and deck stacks. Later animation phases may specialize draw/summon/destroy presentation without changing this contract.

## Reduced motion

`prefers-reduced-motion: reduce` disables the motion layer entirely while preserving the immediate Game State transition.

## Deferred issue

The known Life HUD layout shift remains deferred to final Visual cleanup, as previously approved.
