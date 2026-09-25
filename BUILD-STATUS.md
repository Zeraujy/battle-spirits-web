# Build Status — Battle Spirits Eternal Simulator v3.6.1

## Social Hub & Player Identity
- Social Hub em layout de launcher: navegação lateral, workspace central e friend dock à direita.
- Perfil, avatar, banner e bio redesenhados; imagens são compactadas no navegador antes de salvar.
- Privacidade: Público / Somente Amigos / Privado, discoverability, presença, estatísticas, decks e Maestria.
- Pedidos de amizade realmente pendentes com Aceitar / Recusar.
- Lista de amigos com presença, unread e acesso rápido a DMs.
- Conversas privadas, central de notificações e bloqueios.
- Estatísticas de deck/cartas e Maestria em sete níveis com efeito 3D/Perspectiva.

## Isolamento do Online
- `src/online/publicProfile.js` permanece byte a byte igual à v3.5.2d.
- `src/online/socketClient.js` permanece byte a byte igual à v3.5.2d.
- `server/index.mjs` permanece byte a byte igual à v3.5.2d.
- `verify:v3` agora falha se a camada Social for importada pelo transporte das partidas.
- Supabase Social/Reatime existe somente enquanto o Social Hub está montado.

## Supabase
- Migração: `supabase/SOCIAL-HUB-3.6.sql`.
- Regras RLS/RPC impedem auto-aceite de amizade pelo requester.
- Bloqueios e políticas de mensagens são validados no banco.
- Notificações e marcação de leitura usam RPCs dedicadas.
- Modo legado/local continua disponível antes da migração.

## Validação
- `npm test`: **119/119** passando.
- `npm run verify`: **OK**.
- `npm run verify:v3`: **OK**.
- Parser JSX/TS: **36 arquivos, 0 erros** antes da validação final.
- Database: **365 IDs únicos**, **382 artes WebP**, **0 artes runtime ausentes**.
- `npm run build`: será executado pelo `GERENCIAR_PROJETO.bat` no Windows antes do deploy.


## v3.6.1 validation

- `node scripts/verify-project.mjs`: OK.
- `node scripts/verify-v3.mjs`: OK.
- 119 testes Node existentes: OK.
- Parse de `Profile.jsx`, `socialService.js` e `ProjectInfoButtons.jsx`: OK.
- O build Vite não foi regenerado neste ambiente porque o ZIP de origem contém `node_modules` nativo do Windows; rode `npm install`/`npm ci` no ambiente alvo e então `npm run build`. O ZIP de entrega não inclui `node_modules` nem um `dist` potencialmente desatualizado.
