# v5.2.0 — Talishar Spatial Reference for Battle Spirits

## Reference, not a clone

Talishar is used as a reference for information density, viewport utilization, interaction hierarchy and separation between game state and presentational components. KAIHOU must retain its own visual identity, Battle Spirits terminology, zones and interaction model.

Reference repositories reviewed:

- https://github.com/Talishar/Talishar
- https://github.com/Talishar/Talishar-FE
- https://github.com/Talishar/CardImages

The current Talishar-FE documentation describes a backend → parsed/normalized state → centralized frontend state → React component flow, with smart/container components separated from presentational components. This aligns with the direction already established by KAIHOU's Arena componentization and server-authoritative design.

## Spatial principles to adapt

1. **The battlefield owns the viewport.** Chrome and decorative panels must not steal the primary play area.
2. **Opponent above, local player below.** This remains consistent with KAIHOU's existing orientation.
3. **Peripheral zones live on the edges.** Deck, Trash, Burst, Void and resource displays should not compete with the main Spirit/Ultimate field.
4. **The hand is a dedicated bottom dock.** Cards stay readable and expand through hover/selection rather than forcing the battlefield upward.
5. **A compact right-side utility rail is valid on desktop.** Phase, priority, recent action, log/chat and secondary controls can live there without covering cards.
6. **Playable/targetable state must be visually obvious.** The UI should answer “what can I do now?” without teaching rules inside the component.
7. **Cards are the dominant visual language.** Zone frames should be subtle and mostly disappear once occupied.

## Battle Spirits translation

Talishar zones cannot be copied one-to-one. KAIHOU requires native treatment for:

- Life
- Reserve
- Core Trash
- Void
- Soul Core
- Deck
- Trash
- Burst
- Spirit
- Ultimate
- Brave attachment
- Nexus
- Main / Attack / Flash timing
- BP and Level presentation
- reduction symbols / payment context

## Desktop target composition

```text
┌──────────────────────────────────────────────────┬───────────────┐
│ Opponent HUD                                     │ Turn / Phase  │
│ Life / Reserve / Core state                      │ Priority      │
│                                                  │ Recent action │
│      Opponent Spirits / Ultimates / Braves       │ Log / Chat    │
│      Opponent Nexus                              │               │
│                                                  │               │
├──────────────── battle / timing focus ───────────┤               │
│                                                  │               │
│      Player Spirits / Ultimates / Braves         │               │
│      Player Nexus                                │               │
│                                                  │               │
│ Life / Reserve / Core state                      │               │
│ Player HUD                                       │               │
├──────────────────────────────────────────────────┤               │
│                  Player Hand                     │               │
└──────────────────────────────────────────────────┴───────────────┘
```

## Adaptive battlefield requirement

Battle Spirits can produce denser permanent boards than Flesh and Blood. The field therefore needs adaptive sizing rather than fixed card slots.

Proposed density modes:

- 1–3 units: large field cards.
- 4–6 units: medium field cards.
- 7+ units: compact field cards with stronger hover/focus enlargement.

Nexus should have a distinct lane or secondary spatial band. Braves attached to a host should visually read as a single relationship rather than two unrelated cards.

## Non-negotiable KAIHOU rules

- No gameplay rule is moved into CSS/React presentation conditions.
- Cores remain semantically blue and Soul Core red even in the monochrome interface.
- Existing card automation and authoritative server behavior must remain untouched during structural visual phases.
- Touch support is designed alongside desktop behavior, not patched afterward.
- The new Arena may replace the visual layout, but not Battle Spirits terminology with Flesh and Blood terminology.
