# v5.2.0 — Phase 2: Arena Controller Boundary

## Goal

Remove direct Battle Spirits rule-engine dependencies from the Arena presentation entry point before the visual rewrite.

`Simulator.jsx` previously imported reducer, AI, selectors, card adapters, battle legality, Burst rules, cost calculation and Brave helpers directly. Phase 2 introduces a dedicated controller bridge so the presentation layer no longer knows where those rule implementations live.

## New controller namespace

```text
src/arena/controller/
├── arenaController.js
├── arenaController.test.js
└── index.js
```

The controller is React-independent. It is an orchestration/adapter layer between the current runtime and the future ArenaViewModel v2.

## Responsibilities moved behind the boundary

### Actor and perspective resolution

The controller now resolves:

- current actor / decision owner;
- Burst opportunity owner;
- Ultimate counter-window owner;
- Flash priority owner;
- blocking defender;
- player bottom/top perspective;
- whether the local viewer may control the current actor.

This preserves current behavior for:

- Local mode;
- Eternal CPU;
- Online play.

### Action transport

`dispatchArenaIntent()` selects the current authority path:

```text
Arena intent
    ↓
Arena Controller
    ├── Local → Game Engine reducer
    └── Online → authorized online client action
```

The controller does **not** make online legality decisions. The server remains authoritative.

### CPU planning

CPU decision lookup and timing selection are now exposed through `planArenaCpuDecision()`. The existing AI engine is unchanged.

### Transitional selector facade

Existing field rendering still needs engine-derived values such as effective BP, current level, legal blockers and Brave combination data. Phase 2 routes those calls through the controller rather than rewriting them prematurely.

This facade is intentionally transitional. Phase 3 will replace most of these calls with explicit `ArenaViewModel v2` presentation state.

## Dependency rule

After Phase 2:

```text
Simulator / Arena presentation
          ↓
Arena Controller
          ↓
Game Engine
```

Direct `Simulator.jsx → src/game/*` imports are no longer allowed.

Arena leaf components under `src/components/game/arena/` also remain free of direct Game Engine imports.

## Validation

Added:

```bash
npm run architecture:v520:phase2:audit
npm run architecture:v520:phase2:test
```

The Phase 2 audit is appended to `npm run verify`.

Focused tests cover:

- actor/priority precedence;
- Local/CPU/Online perspective selection;
- rejected online actions from the wrong viewer;
- authorized online action forwarding without client-side legality interpretation.

## Runtime impact

- Battle Spirits rules changed: **NO**
- Effect Engine changed: **NO**
- AI decision engine changed: **NO**
- Online protocol changed: **NO**
- Supabase schema changed: **NO**
- Arena layout changed: **NO**
- Public/card assets changed: **NO**

## Exit criteria

- [x] Dedicated Arena controller namespace exists.
- [x] `Simulator.jsx` has zero direct `src/game/*` imports.
- [x] Arena presentation components have zero direct Game Engine imports.
- [x] Local/CPU/Online modes use the controller boundary.
- [x] Actor/perspective orchestration is outside presentation code.
- [x] Focused controller tests exist.
- [x] Controller audit is part of project verification.

**Phase 2 status: PASS.**
