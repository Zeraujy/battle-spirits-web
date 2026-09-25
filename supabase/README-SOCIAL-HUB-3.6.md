# Social Hub v3.6.0 — Supabase

A v3.6.0 mantém o servidor de partidas Online separado do sistema social.

## Ativação

No mesmo projeto Supabase já usado pelo simulador:

1. Abra **SQL Editor**.
2. Cole o conteúdo de `SOCIAL-HUB-3.6.sql`.
3. Execute uma única vez.
4. Recarregue o simulador.

O SQL é idempotente e foi preparado para atualizar a estrutura antiga `SOCIAL-SETUP-2.3.sql`.

## O que a migração adiciona

- privacidade do perfil;
- políticas de pedidos e mensagens;
- presença Online/Offline;
- pedidos pendentes e aceite/recusa;
- bloqueios;
- notificações;
- mensagens não lidas;
- RPCs para busca, amigos, conversas e segurança.

## Isolamento das partidas

O Social Hub usa Supabase apenas enquanto a tela social está aberta.

As partidas continuam usando:

- `src/online/publicProfile.js`
- `src/online/socketClient.js`
- `server/index.mjs`

Nenhum objeto completo de perfil social é enviado ao Socket.IO.
