# Battle Spirits Eternal Simulator v4.0.0 — Eternal Platform

## Objetivo
Consolidar a experiência criada ao longo da linha 3.x e corrigir a hierarquia/posicionamento do fluxo Ranked sem alterar regras de Battle Spirits ou a lógica competitiva existente.

## Ranked UX
- Nova estrutura vertical dedicada para o conteúdo competitivo.
- Cabeçalho compacto com Season, Rank, RP e estado de conexão.
- Área VS isolada das estatísticas e do histórico.
- Estatísticas da temporada reorganizadas e responsivas.
- Histórico com leitura mais limpa, data curta e estado vazio para contas sem partidas.
- Ações do menu simplificadas para reduzir controles repetidos.
- O Deck Builder passa a ser oferecido diretamente no fluxo competitivo quando o deck precisa ser corrigido.
- Breakpoints dedicados para desktop baixo, tablets e telas compactas.
- `rankedV370.css` removido por ter sido substituído integralmente por `rankedV400.css`.

## Eternal Platform polish
- Nova camada visual global `eternalPlatformV400.css`.
- Transições curtas e consistentes entre telas.
- Foco por teclado padronizado em controles interativos.
- Respeito global a `prefers-reduced-motion` nas novas transições.
- O menu principal deixa de marcar o Tutorial como novidade depois que ele é concluído.
- Estado de loading recebeu acabamento consistente com a identidade monocromática.

## Compatibilidade
- Nenhuma alteração nas regras da engine.
- Nenhuma alteração em RP, matchmaking, Season 0 ou cálculo de resultado Ranked.
- Nenhuma migration nova.
- Nenhuma variável nova em `server/.env`.
