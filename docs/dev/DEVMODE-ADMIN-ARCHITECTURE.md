# DevMode / Admin Panel — Proposed Architecture (Paused)

Status: **design only**. No DevMode controls are enabled in v4.2.2. Finish Shop integration before implementation.

## Goal
Provide a QA-only environment for trusted developers to manipulate test account state without exposing economy mutation capabilities to normal players.

## Security boundary
The browser/Electron renderer must never be able to grant currency or cards by directly writing database rows. DevMode mutations should be server-side only and require a separate admin authorization check.

Recommended layers:

1. **DevMode UI** — hidden route/panel available only after the backend reports an authorized QA role.
2. **Admin API / Supabase Edge Function** — receives explicit test commands and validates the authenticated user plus an allow-listed admin role.
3. **Security-definer admin RPCs** — narrow functions for QA operations. Do not expose generic SQL or arbitrary table mutation.
4. **Audit log** — every command records actor user id, target user id, operation, before/after values, timestamp and optional QA note.
5. **Environment lock** — production can disable the feature globally with a server-side flag even for admin accounts.

## Suggested commands

- `grant_spirit_coins(amount)`
- `grant_craft_coins(amount)`
- `set_spirit_coins(amount)`
- `set_craft_coins(amount)`
- `grant_card(card_id, quantity)`
- `set_card_quantity(card_id, quantity)`
- `grant_deck_recipe(recipe_id)`
- `reset_test_economy()`
- `complete_or_reset_onboarding()`
- `simulate_product_purchase(product_id, quantity)`

All card quantities must still respect the global 0–6 collection limit unless a deliberately isolated debug-only command is added later.

## Recommended database additions

- `bs_admin_roles(user_id, role, enabled, created_at)`
- `bs_admin_audit_log(id, actor_user_id, target_user_id, operation, payload, result, created_at)`
- optional `bs_runtime_flags(key, value)` with `dev_mode_enabled=false` by default.

RLS should not make these tables writable by normal authenticated clients. Admin mutations should execute through a server-side boundary.

## UI suggestion
A compact monochrome QA console consistent with the simulator identity:

- account search / current account target;
- wallet controls;
- collection controls;
- recipes/onboarding controls;
- recent admin actions;
- large persistent `DEV MODE` watermark while active;
- confirmation step for destructive actions such as reset.

## Important rule
Never ship a client-side secret, service-role key, magic password, hidden keyboard shortcut that directly grants privileges, or an unrestricted `addCoins()` production endpoint. Hiding a button is not authorization.
