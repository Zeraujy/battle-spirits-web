# Social Hub v3.6.1 — migração incremental

1. Se o banco ainda não recebeu a v3.6.0, execute primeiro `SOCIAL-HUB-3.6.sql`.
2. Depois execute `SOCIAL-HUB-3.6.1.sql` no SQL Editor do mesmo projeto Supabase.
3. Recarregue o simulador. Em Privacidade, o rodapé deve indicar `Social Hub 3.6.1`.

A v3.6.1 adiciona status personalizado, preferências privadas de favorito/silenciado e RPCs revisadas. O indicador de digitação usa Supabase Realtime Broadcast e não é persistido no banco.
