# START HERE — v5.0.3

## Base oficial

O projeto é exclusivamente Web + Online. Use os comandos npm como ponto de entrada para desenvolvimento, testes, validação e publicação.

## Desenvolvimento

```bash
npm install
npm run dev
```

Servidor Online local, quando necessário:

```bash
npm run dev:server
```

## Antes de publicar

```bash
npm run project:check
```

## Publicação

```bash
npm run publish:cloudflare
```

A camada Social e o transporte das partidas permanecem independentes. Não acople `socialService.js` a `src/online/publicProfile.js`, `src/online/socketClient.js` ou `server/index.mjs`.

## v5.0.3 database step

If you use authenticated Shop purchases, run `supabase/ECONOMY-5.0.3-DECK-PURCHASE-FIX.sql` after the prior economy migrations.
