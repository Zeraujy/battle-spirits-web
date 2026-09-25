# Battle Spirits Eternal Simulator — v3.6.1

## Social Hub Polish & Stability

Atualização incremental focada em acabamento, usabilidade e estabilidade do Social Hub, sem alterar a comunicação Socket.IO das partidas.

### Amigos
- Favoritos persistentes e privados, exibidos antes dos demais amigos.
- Amigos Online continuam priorizados dentro da ordenação.
- Filtro rápido por nome e @username.
- Silenciar conversa como preferência privada do jogador.
- Status personalizado de até 80 caracteres.

### Mensagens
- Indicador `digitando…` via Supabase Realtime Broadcast; o estado não é salvo no banco.
- Recibos visuais `Enviada` / `Lida` usando `read_at`.
- Timestamps com Hoje/Ontem para leitura mais rápida.
- Conversas exibem favorito, silenciado e status personalizado sem duplicar controles.

### Privacidade e Supabase
- Nova tabela `bs_social_preferences`, protegida por RLS e acessível por RPC validada.
- Preferências de favorito/silenciado são visíveis somente ao próprio usuário.
- `bs_get_social_profile`, `bs_list_friends` e `bs_list_conversations` atualizados para a v3.6.1.
- `bs_social_health()` agora reporta `3.6.1`.

### Online preservado
- Nenhuma dependência social foi adicionada a `src/online/publicProfile.js` ou `src/online/socketClient.js`.
- Digitação, DMs, presença, favoritos e notificações continuam fora do Socket.IO da partida.

### Migração
Execute, nesta ordem, quando necessário:

1. `supabase/SOCIAL-HUB-3.6.sql`
2. `supabase/SOCIAL-HUB-3.6.1.sql`
