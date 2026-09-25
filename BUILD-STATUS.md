# Build Status — Battle Spirits Eternal Simulator v3.3.1e

## Online Account Compatibility Fix
- O Online não envia mais o objeto completo retornado por `getProfile()`.
- O payload público contém somente nome, username, cor do jogador e avatar Online compacto.
- `banner`, `bio` e quaisquer outros campos da conta ficam fora do Socket.IO.
- Avatar Data URL acima do orçamento é redimensionado no cliente; se não puder ser reduzido, a partida continua sem avatar.
- `socketClient.js` possui uma segunda barreira antes do emit.
- O servidor sanitiza o perfil novamente e usa `maxHttpBufferSize` de 512 KiB.

## Fast Update & Deploy Workflow
- `GERENCIAR_PROJETO.bat` continua automatizando PATCH-ONLY, validação, build, commit/push e deploy Wrangler.
- `.git`, `node_modules`, `dist`, `release`, `.env` e `server/.env` são preservados durante updates.
- O script PowerShell permanece compatível com Windows PowerShell 5.1.

## Asset optimization preservada
- Wallpapers continuam otimizados em 1920×1080.
- Card back e indicadores de Level continuam em WebP.
- Database reutiliza as artes WebP canônicas e mantém placeholder de verso durante carregamento.

## Validação esperada
- `npm run verify`
- `npm run verify:v3`
- `npm test`
- `npm run build` (com dependências instaladas)

A v3.3.1e preserva IA, AI Debugger, Lookahead, Matchmaking, regras e database da linha 3.3.1.
