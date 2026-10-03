# Build Status — Battle Spirits: KAIHOU! Simulator v5.0.3

## Escopo

Base oficial Web + Online. O pacote-fonte não inclui dependências instaladas, bundles gerados, secrets ou arquivos temporários.

## Verificações obrigatórias

- Catálogo e referências de cartas.
- Integridade estrutural.
- Auditoria de imagens e thumbnails.
- Testes automatizados.
- Auditoria de UI e informações técnicas expostas.
- Auditoria de release e segurança.
- Build Vite.

Execute `npm run project:check` antes de qualquer publicação.


## v5.0.1 Starter Deck Shop Recipes
- 17 Starter Deck products active in Shop.
- All Starter Deck products use explicit validated recipes.
- SD14 and SD16 gameplay records added to the runtime catalog.
- SD01 split into Blazing Thunder and Diamond Deity.
- SD64 campaign cards excluded from the playable 40-card recipe.


## v5.0.3 All Decks in Onboarding
- New-player onboarding mirrors every active deck product from the Shop.
- All 17 active decks are selectable in the initial choose-3 flow.
- Guest and authenticated starter claims accept any active deck product.
- A dedicated audit prevents Shop/onboarding deck lists from diverging.

## v5.0.3 Starter Deck Purchase Fix

Authenticated deck purchases now route through deck contents/recipes correctly. Apply `supabase/migrations/economy/economy-5.0.3-deck-purchase-fix.sql` to existing Supabase projects.


## v5.1.0 Development — Effect Engine Phase 10–12
- Replacement/prevention windows added for destruction and Life loss.
- Battle triggers now dispatch `whenBlocked`, `whenBattles`, pre/post battle resolution and Life-decrease events.
- Canonical Start/Core/Draw/Refresh/Main/Attack/End step events are emitted by the turn flow.
- Internal app version remains 5.0.3 until the v5.1.0 release is promoted.
- Phase 10–12 tests: 34/34. Global regression: 229/229.
