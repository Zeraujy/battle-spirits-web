# Social Hub v3.6.3 — Card Mastery 2.0

Execute `SOCIAL-HUB-3.6.3.sql` **depois** de `SOCIAL-HUB-3.6.2.sql`.

A migração adiciona os IDs das cartas do deck usado ao histórico, cria a progressão `bs_card_mastery`, um ledger idempotente que impede XP duplicado e RPCs para aplicar/reconciliar Maestria. A leitura da progressão continua restrita ao dono da conta por RLS.

O Socket.IO das partidas não recebe dados de Maestria. O resultado é processado somente depois que `winnerId` já existe.
