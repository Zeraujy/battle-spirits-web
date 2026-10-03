# Getting Started

The project uses a Web-only frontend plus a separate authoritative multiplayer server.

## Install

```bash
npm install
```

## Frontend development

```bash
npm run dev
```

## Local multiplayer server

```bash
npm run dev:server
```

## Validation

Use the full project check before publishing:

```bash
npm run project:check
```

For source-only validation without the Vite build step:

```bash
npm run verify
npm test
npm run regression:full
```

## Publish

```bash
npm run publish:cloudflare
```

Database migrations are organized below `supabase/migrations/` by domain. Apply only the migrations required by the target environment and never expose privileged server credentials to the frontend.
