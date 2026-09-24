# v3.3.1c — Fast Update & Deploy Workflow

## Atualização do projeto
- Novo `GERENCIAR_PROJETO.bat` com aplicação automática de ZIP PATCH-ONLY.
- Protege `.git`, `node_modules`, `dist`, `release`, `.env` e `server/.env`.
- Executa `npm install` apenas quando necessário.
- Fluxo integrado de verify/test/build → Git commit/push → Wrangler deploy.

## Cloudflare
- Suporte a deploy direto com `npx wrangler@4 deploy`, evitando o build remoto quando o deploy automático por Git for desativado.
- Mantém GitHub como fonte e histórico do projeto, mas permite publicação imediata pelo PC local.

## Imagens
- Wallpapers recomprimidos mantendo 1920×1080: ~20,3 MB → ~1,7 MB.
- `card-back.webp`: ~62 KB substitui o PNG de ~412 KB.
- LV1–LV5 em WebP: ~0,28 MB total substitui ~3,0 MB de PNG.
- As cartas atuais já estão em WebP 300×437; `resolveCardThumbnail()` reutiliza o mesmo asset e não faz mais uma tentativa em `cards-thumbnails/`.
- Auditoria de imagens passa a monitorar peso dos assets canônicos, sem exigir árvore duplicada de thumbnails.

## Compatibilidade
- Mantém IA v3.3.1, Online/Matchmaking, Lookahead, AI Debugger e placeholder de verso.
