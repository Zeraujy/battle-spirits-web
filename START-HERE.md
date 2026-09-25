# START HERE — v3.6.0

## Social Hub & Player Identity

Arquivos principais desta revisão:

- `src/pages/Profile.jsx` — novo Social Hub em estilo launcher.
- `src/styles/pages/socialHubV360.css` — identidade visual e layout sem scroll de página.
- `src/services/socialService.js` — perfil cloud, privacidade, pedidos, amigos, DMs, notificações, presença e bloqueios.
- `src/services/socialInsights.js` — estatísticas locais de decks/cartas e Maestria.
- `src/online/socialInsights.test.js` — testes da camada de insights/Maestria.
- `supabase/SOCIAL-HUB-3.6.sql` — migração social e políticas de segurança.
- `supabase/README-SOCIAL-HUB-3.6.md` — instruções da migração.
- `src/online/publicProfile.js` — **continua isolado** e permanece responsável pelo perfil mínimo das partidas Online.
- `src/components/common/ProjectInfoButtons.jsx` — Patch Notes internos.

## Regra de arquitetura importante

Não importe `socialService.js` em `src/online/publicProfile.js`, `src/online/socketClient.js` ou `server/index.mjs`.

A camada Social e o transporte das partidas devem continuar independentes.

## Maestria v3.6.0

A primeira versão usa dados que já existem no dispositivo:

- presença da carta em decks;
- quantidade de cópias;
- quantidade de decks diferentes;
- uso como carta de capa.

Isso evita ler estado oculto ou tráfego das partidas Online. Histórico competitivo real pode ser adicionado depois por uma integração pós-partida separada.

## Antes de publicar

```powershell
npm run check
```

Depois, execute `supabase/SOCIAL-HUB-3.6.sql` no Supabase para liberar todos os recursos cloud da nova interface.
