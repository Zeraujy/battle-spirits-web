# Cloudflare Deployment

## Web application

- Build command: `npm run build`
- Deployment command: `npx wrangler@4 deploy`
- Project root: `/`
- Production branch: `main`
- Vite output: `dist/`
- SPA fallback is configured through `wrangler.jsonc`.

## Multiplayer

The frontend and the authoritative multiplayer server are separate services. The browser obtains the public server endpoint from the runtime online configuration or the build environment.

The multiplayer endpoint must be publicly reachable through HTTPS/WSS for browser matchmaking and matches.

## Account and cloud services

Frontend builds use the public Supabase configuration values expected by the application. Privileged server-only credentials must never be included in browser code or public assets.

## Validation before deployment

```bash
npm install
npm run project:check
```

## Manual deployment

```bash
npm run deploy:cloudflare
```
