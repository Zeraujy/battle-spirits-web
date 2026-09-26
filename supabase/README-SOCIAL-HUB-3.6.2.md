# Social Hub 3.6.2 — Match History & Player Statistics

Execute `SOCIAL-HUB-3.6.2.sql` **depois** de `SOCIAL-HUB-3.6.1.sql`.

A migração cria `bs_match_history`, protegida por RLS. Cada usuário autenticado pode ler e registrar apenas o próprio histórico. Linhas gravadas não podem ser alteradas ou apagadas pelo cliente.

A partida continua usando Socket.IO normalmente. O histórico é produzido somente quando `winnerId` já existe e recebe um resumo final compacto em serviço separado.

Sem Supabase, ou antes da migração, a v3.6.2 mantém um histórico local no navegador/desktop para que estatísticas básicas continuem funcionando.
