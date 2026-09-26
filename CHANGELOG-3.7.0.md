# Battle Spirits Eternal Simulator v3.7.0 — Ranked Season 0

## Ranked ativo
- Conta Supabase obrigatória.
- Deck validado tanto no cliente quanto novamente no servidor.
- Matchmaking competitivo separado do matchmaking Normal.
- Fila por proximidade de RP com expansão gradual da janela de busca.
- O servidor cria a sala Ranked diretamente após o pareamento.

## Rating
- Season 0 começa em 1000 RP.
- Progressão: Bronze, Silver, Gold, Platinum, Diamond e Master.
- Ajuste de RP calculado no servidor considerando diferença de rating.
- Pico, vitórias e derrotas persistidos por temporada.

## Histórico
- `bs_ranked_matches` registra resultado, RP antes/depois, delta, oponente e motivo do encerramento.
- O jogador só pode ler o próprio histórico através de RLS.
- O cliente não possui permissão de escrita de RP.

## Abandono / reconexão
- Ranked reutiliza o resume token do Online.
- Ao desconectar durante uma partida Ranked, o jogador tem 90 segundos para voltar.
- Se não retornar, o servidor encerra a partida por `ranked_disconnect` e registra o resultado.

## Infraestrutura
Execute `supabase/SOCIAL-HUB-3.7.0.sql` e configure no servidor Online:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

A Service Role deve existir somente no servidor e nunca no frontend, GitHub público ou `VITE_*`.
