# Battle Spirits Eternal Simulator v3.1.9 — Card Interaction

A v3.1.9 mantém a Rules Engine da linha estável v3.1.x e foca em deixar cartas e Cores mais naturais de manipular no desktop.

## Cores — clique ou arraste
- Core tokens da Reserve continuam podendo ser arrastados manualmente.
- Agora também podem ser clicados para um fluxo inteligente de pagamento.
- Em invocações/deploys pendentes, os cliques pagam primeiro o Custo de Invocação no Core Trash.
- Depois do custo completo, os próximos cliques colocam Cores na carta pendente para cumprir o Lv mínimo.
- Após o mínimo, cliques adicionais continuam adicionando Cores à carta, permitindo confirmar a invocação em níveis maiores.
- Em Magic/Flash, clicar nos Cores da Reserve envia automaticamente o pagamento ao Core Trash.
- Clicar em um Core no Core Trash durante pagamento pendente desfaz um Core do pagamento.
- Clicar em Core da carta pendente devolve o Core à Reserve para corrigir a distribuição.
- Durante o Main Step, ao selecionar uma carta própria em campo, clicar em um Core da Reserve pode adicioná-lo à carta selecionada.
- Toda movimentação continua sendo validada por `MOVE_CORE` na Rules Engine; a UI apenas sugere o destino do clique.

## Cartas — interação mais fluida
- Hover/zoom reduzido de 420 ms para 260 ms.
- Preview de carta tenta abrir ao lado da carta sob o mouse para reduzir oclusão da Arena.
- Iniciar um drag fecha imediatamente o preview para não disputar espaço com a carta arrastada.
- Mão recebeu animação leve de entrada para cartas compradas/adicionadas.
- Feedback visual de drag/drop foi refinado para campo, mão, Deck, Trash e Burst.
- Magic/Flash recebe feedback de área da Arena durante drag.
- Animações respeitam `prefers-reduced-motion`.

## Organização
- `src/interactions/coreClickPolicy.js`: política de UX para decidir o destino sugerido de um clique em Core.
- `src/game/coreClickPolicy.test.js`: testes automatizados da política de clique.
- `src/styles/arena/cardInteractionV319.css`: estilos isolados da v3.1.9.
- Regras continuam em `src/game/`; nenhum requisito de custo, timing ou movimento foi movido para CSS/componentes.
