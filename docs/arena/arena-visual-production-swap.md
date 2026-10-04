# Arena Visual — Production Swap

The Arena Visual is now the default renderer for live matches.

## Default

Normal match URLs use the new Arena automatically.

## Legacy fallback

Use the explicit query parameter below only for regression comparison or emergency fallback:

`?arena=legacy`

The previous integration link remains accepted:

`?arena=visual`

## Authority

The production swap does not move gameplay authority into React presentation components.

The existing Simulator controller and Rules Engine remain authoritative for:

- phase progression;
- Core and Soul Core movement;
- summon / play cost;
- Brave combine / separate;
- attack and block declaration;
- Flash priority;
- Burst activation;
- effect decisions;
- Online synchronization.

## Release gate

Before removing the legacy renderer entirely:

1. run `npm run verify`;
2. run `npm test`;
3. run `npm run regression:full`;
4. run `npm run ui:audit`;
5. run `npm run release:audit`;
6. run `npm run security:audit`;
7. validate Local / CPU / Online manually in the new Arena;
8. retain `?arena=legacy` until the production validation cycle is complete.
