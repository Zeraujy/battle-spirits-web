# Build Status — Battle Spirits Eternal Simulator v3.3.1a

## Image Performance Hotfix
- Home wallpaper: carregamento progressivo; não existe mais `Promise.all()` dos 10 wallpapers.
- Thumbnails: **382** imagens WebP em `public/cards-thumbnails/`, largura de 300 px.
- Artes originais permanecem intactas em `public/cards-database/`.
- Deck Builder usa thumbnails + `loading=lazy` + `decoding=async` + prioridade baixa.
- Deck Library usa thumbnails e lazy loading.
- Próxima página do Deck Builder recebe prefetch apenas em idle.
- `public/_headers` adiciona cache para assets estáticos.

## Validação esperada
- `npm run verify`
- `npm run verify:v3`
- `npm test`
- `npm run build` (após `npm install`)

A v3.3.1a preserva integralmente Archetype Intelligence, AI Debugger, Lookahead e Online/Matchmaking da v3.3.1.
