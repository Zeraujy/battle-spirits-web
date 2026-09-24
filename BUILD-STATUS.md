# Build Status — Battle Spirits Eternal Simulator v3.3.1b

## Card Back Loading Placeholder
- Database/Deck Builder usa `public/images/card-back.png` como placeholder enquanto thumbnails em lazy-loading ainda estão inativas ou carregando.
- A arte frontal entra com fade curto após `load`.
- Falha de thumbnail tenta automaticamente a arte original.
- Se thumbnail e arte original falharem, o verso permanece visível e evita o ícone de imagem quebrada.
- O placeholder reutiliza um único asset cacheável; não reverte as otimizações da v3.3.1a.
- Arena, zoom e modal continuam usando a arte original normalmente.

## Validação esperada
- `npm run verify`
- `npm run verify:v3`
- `npm test`
- `npm run build` (após `npm install`)

A v3.3.1b preserva Archetype Intelligence, AI Debugger, Lookahead, Online/Matchmaking e o Image Performance Hotfix da v3.3.1a.
