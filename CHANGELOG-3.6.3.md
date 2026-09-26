# Battle Spirits Eternal Simulator v3.6.3 — Card Mastery 2.0

## Maestria real de partidas
- Cartas presentes no deck salvo realmente utilizado em uma partida finalizada passam a receber XP.
- +40 XP por partida, +20 XP por vitória e +15 XP para a carta de capa.
- Cada `match_uid + card_id` só pode conceder XP uma vez.
- Progressão persistente em sete níveis: I–VII.

## Perfil
- A antiga afinidade baseada apenas em deckbuilding deixa de ser a fonte principal da aba Maestria.
- Nova tela individual de carta com XP, próximo nível, partidas, vitórias, taxa de vitória e uso como capa.
- Visão Geral passa a destacar a Maestria 2.0.

## Persistência
- Novo `cardMasteryService` com fallback local.
- `SOCIAL-HUB-3.6.3.sql` adiciona `deck_card_ids`/`cover_card_id` ao histórico, `bs_card_mastery`, ledger idempotente e RPCs de atualização/reconciliação.
- Progresso local pode ser reconciliado com a nuvem depois que a migração for aplicada.

## Online
- Nenhuma alteração no payload Socket.IO.
- A Maestria só é processada após a engine já ter confirmado `winnerId`.
