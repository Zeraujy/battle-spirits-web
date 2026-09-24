# Build Status — Battle Spirits Eternal Simulator v3.3.1d

## Fast Update & Deploy Workflow
- `GERENCIAR_PROJETO.bat` automatiza aplicação de PATCH-ONLY, validação, build, commit/push e deploy Wrangler.
- `.git`, `node_modules`, `dist`, `release`, `.env` e `server/.env` são preservados durante updates.
- `npm install` só roda quando necessário.
- Deploy local via Wrangler pode substituir o build remoto do Cloudflare, evitando a espera de inicialização do ambiente.

## Asset optimization
- Wallpapers 1920×1080: ~20,3 MB → ~1,7 MB.
- Card back: PNG ~412 KB → WebP ~62 KB.
- Indicadores de Level: ~3,0 MB → ~0,28 MB em WebP.
- As 382 artes de carta atuais já são WebP 300×437 (~12,2 MB total), então listas usam a própria arte canônica sem thumbnail duplicada.
- Remove o custo de requisições para `cards-thumbnails` inexistentes + fallback.

## Validação esperada
- `npm run verify`
- `npm run verify:v3`
- `npm test`
- `npm run build` (com dependências instaladas)

A v3.3.1d preserva IA, AI Debugger, Lookahead, Online/Matchmaking e o placeholder de verso da v3.3.1b.


## v3.3.1d — Pipeline Test

Atualização mínima para validar o novo GERENCIAR_PROJETO.bat. Confirmação visual: `V3.3.1d` + `UPDATE OK` na Home.
