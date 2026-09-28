# v5.1.0 — Phase 17: Complex Player Decisions

Phase 17 expands `match.pendingEffectDecision` into the common authoritative representation for legitimate player choices.

## Structured decision types

- `selectTarget`
- `selectMultipleTargets`
- `chooseOption`
- `chooseYesNo`
- `chooseCardsFromHand`
- `chooseCardsFromTrash`
- `chooseCardsFromDeck`
- `chooseOrder`
- `chooseCoreDistribution`

All decisions are created by the Effect Engine and resolved through `RESOLVE_EFFECT_DECISION`. The reducer validates ownership, legal candidates, target counts, ordering completeness and Core totals before applying the choice.

Online clients therefore submit only an intent; they do not directly mutate competitive state. CPU legal-actions support was extended for the new decision families as well.
