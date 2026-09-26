# Battle Spirits Eternal Simulator v3.6.2
## Match History & Player Statistics

### Novo
- Histórico de partidas para Local, Eternal CPU e Online.
- Estatísticas reais: partidas, vitórias, derrotas, win rate e duração média.
- Deck mais utilizado, cor mais utilizada e modo mais frequente.
- Nova aba **Estatísticas** dentro do Social Hub.
- Identificação automática do deck utilizado comparando a lista inicial da partida com os decks salvos.
- Fallback local de histórico para jogar sem conta/Supabase.
- Sincronização opcional com `bs_match_history` no Supabase.

### Segurança e arquitetura
- O registro acontece somente depois de `winnerId` confirmado pela engine.
- Socket.IO continua dedicado à partida; histórico e estatísticas usam serviço separado.
- `SOCIAL-HUB-3.6.2.sql` usa RLS e não permite update/delete direto pelo cliente.
- Esta versão não transforma histórico normal em dado competitivo confiável. Ranked continua planejado para validação server-side na v3.7.0.

### Migração
Execute no Supabase, em ordem:
1. `SOCIAL-HUB-3.6.sql`
2. `SOCIAL-HUB-3.6.1.sql`
3. `SOCIAL-HUB-3.6.2.sql`
