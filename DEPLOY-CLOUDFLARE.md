# Deploy Cloudflare — Battle Spirits Eternal Simulator v3

Este pacote foi preparado para substituir o conteúdo do repositório:
Zeraujy/battle-spirits-web

## Cloudflare Workers
- Build command: `npm run build`
- Deploy command: `npx wrangler@4 deploy`
- Root directory: `/`
- Production branch: `main`
- Saída do Vite: `dist`
- SPA fallback: habilitado em `wrangler.jsonc`

## Multiplayer
O frontend e o servidor multiplayer são serviços separados.

O endereço usado pelo jogo está em:
`public/config/online-config.js`

Configuração atual:
`https://desktop-88e9pl9.tail8fb8c7.ts.net`

Para o Online 1v1 funcionar no site, esse servidor precisa estar publicamente acessível por HTTPS/WSS.

## Supabase
Login/perfil usam variáveis de build:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Configure essas variáveis no ambiente de build da Cloudflare.

Não coloque uma chave `service_role` no frontend.

## Teste
```bash
npm install
npm run verify
npm test
npm run build
```

## Deploy manual
```bash
npm install
npm run deploy:cloudflare
```
