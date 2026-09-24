# START HERE — v3.3.0

Se você está aprendendo o projeto, comece por estes caminhos:

1. `src/pages/Simulator.jsx` — composição geral da Arena.
2. `src/styles/arena/arenaV31.css` — estrutura visual principal da Arena; `arenaLayoutV321.css` concentra os ajustes consolidados atuais.
3. `src/styles/arena/cardPresentationV317.css` — tamanho, LV/BP, Brave e glow das cartas em campo.
4. `src/styles/arena/battleEmphasisV317.css` — feedback visual de atacante, bloqueador e bloqueadores legais.
5. `src/components/cards/CardTile.jsx` — visual compartilhado de uma carta.
6. `src/interactions/cardPointerDrag.js` — utilitários do novo arraste de cartas.
7. `src/game/` — regras e estado da partida. Evite colocar regras dentro de componentes React.
8. `src/services/cardRepository.js` — carregamento dos JSONs de cartas.
9. `public/cards-database/` — imagens organizadas por coleção.

Antes de entregar uma alteração:

```powershell
npm run check
```

Isso verifica estrutura/imagens, roda os testes e gera o build de produção.


## v3.1.8 — Core & Combat UX

- `src/components/game/PaymentStatus.jsx`: mostra custo/redução/progresso.
- `src/components/game/BattleLinkOverlay.jsx`: seta/ligação visual de batalha.
- `src/styles/arena/coreCombatV318.css`: estilos da atualização.

A lógica de regras continua em `src/game/`.


## v3.1.9 — Card Interaction

A interação de cartas e Cores foi refinada sem mover regras para a UI.

- `src/interactions/coreClickPolicy.js`: decide apenas o destino sugerido de um clique em Core.
- `src/game/cores.js`: continua sendo a autoridade que valida e executa MOVE_CORE.
- `src/styles/arena/cardInteractionV319.css`: feedback visual da v3.1.9.
- `CoreArea.jsx` e `CardTile.jsx`: aceitam clique nos Core tokens além do drag existente.


## v3.2.0 — Rules & Effects Expansion

- `src/game/burstRules.js`: timing automático e janela de Burst.
- `src/game/effectEngine/actionResolver.js`: operações estruturadas e proteções temporárias.
- `src/game/databaseEffectCoverage.test.js`: garante cobertura dos tipos de operações da database atual.
- `src/styles/arena/rulesEffectsV320.css`: painel visual da janela de Burst.
- `src/components/common/ProjectInfoButtons.jsx`: Patch Notes internos do jogo. Atualize este arquivo em **toda nova versão**.

A Reserve e o Core Trash não devem receber caixas extras de orientação durante pagamento; o feedback de custo fica no painel da jogada pendente.


## v3.2.1 — Match Stability & AI Readiness

- `src/game/legalActions.js`: fonte central para enumerar ações válidas de um jogador.
- `src/game/stateValidation.js`: auditoria de integridade do estado da partida.
- `src/game/actionLog.js`: registro estruturado de ações bem-sucedidas.
- `src/game/snapshots.js`: snapshot, restauração e replay de Action Log.
- `src/game/random.js`: RNG determinístico opcional por seed.
- `src/game/devTools.js`: snapshot técnico com ações legais e integridade para debug.
- `src/styles/arena/arenaLayoutV321.css`: base consolidada de Decks, mãos e zonas da Arena.

A futura IA deve consultar `getLegalActions` em vez de reimplementar regras próprias.


## v3.2.2 — CPU Combat Intelligence

- `src/game/ai.js`: avaliação do Attack Step agora considera pressão total, trocas de BP e risco defensivo do turno seguinte.
- `src/game/ai.test.js`: cobertura de preservação do último bloqueador, ataques suicidas, bloqueio eficiente e lethal.
- A CPU continua obrigada a executar somente ações retornadas por `getLegalActions()`.

A próxima etapa planejada após esta versão era **Core & Resource Management**, sem mover regras de custo para a IA.


## v3.2.3 — CPU Core & Resource Management

- `src/game/legalActions.js`: expõe variantes legais de invocação com Cores adicionais e movimentos de Reserve para Level Up.
- `src/game/ai.js`: avalia flexibilidade de Cores, redução de custo, níveis, efeitos vinculados a Level e capacidade de continuar jogando depois de gastar recursos.
- `src/game/ai.test.js`: cobre invocação em Level superior, Level Up, preservação de Reserve e sinergia de símbolos/redução.
- Toda ação continua passando pela Rules Engine; a IA não ganha uma regra paralela de pagamento.

A etapa seguinte é **Flash, Magic & Burst Intelligence**, implementada na v3.2.4.


## v3.2.4 — Flash, Magic & Burst Intelligence

- `src/game/effects.js`: valida o timing estruturado de Magic sem bloquear cartas antigas ainda não estruturadas.
- `src/game/legalActions.js`: durante o Main Step, Main e Flash são expostos separadamente e continuam filtrados pela Rules Engine.
- `src/game/ai.js`: avalia respostas de Flash, decisões pendentes de efeitos, preservação de Magic, Set Burst e ativação de Burst conforme o contexto.
- `src/game/effectEngine/normalizer.js`: variantes `lifeDecrease` / `afterLifeReduced` agora entram na mesma janela automática de Burst após perda de Life.
- `src/game/ai.test.js`: cobre timing de Magic, resposta a lethal, economia de Flash, prioridade de Burst suportada e decisão entre ativar/passar.

A etapa seguinte é **Card Effect Intelligence**, implementada na v3.2.5.


## v3.2.5 — Card Effect Intelligence

- `src/game/aiEffectSemantics.js`: camada dedicada que mede o valor estratégico dos efeitos estruturados a partir da transição real de estado.
- `src/game/ai.js`: Decision Queue, Magic, Burst e Trigger passam a combinar avaliação geral do tabuleiro com score semântico dos efeitos.
- Destruição, retorno à mão/deck, Exhaust, Refresh, alterações de BP, compra/recuperação de cartas, geração de Core, Life e proteções recebem sinais próprios.
- As decisões ranqueadas guardam `effectScore` e `effectReasons`, preparando o futuro AI Debugger.
- A camada semântica acompanha apenas cartas que já eram públicas e contagens públicas; a identidade da mão/deck ocultos do oponente não é usada.


## v3.3.0 — Planning / Lookahead

- `src/game/ai.js`: adiciona `rankAIPlans()` com busca em largura limitada, orçamento determinístico de nós e desconto de ações futuras.
- Normal compara a jogada atual com uma continuação; Hard pode planejar até três decisões futuras além da ação raiz, recalculando o plano após cada ação real.
- A busca sempre usa `getLegalActions()` + `applyGameAction()` e para assim que o controle passa ao adversário.
- Ações de progresso como Main → Attack são mantidas no feixe de busca mesmo quando possuem score imediato menor, permitindo enxergar pressão e lethal do Attack Step.
- Mudanças que revelam informação antes oculta do deck encerram o lookahead; a CPU executa a ação e só então replana com a informação realmente conhecida.
- Os resultados ranqueados passam a expor `planScore`, `planBonus`, `planDepth`, `planNodes` e `planActions`, preparando o AI Debugger visual.

A próxima etapa planejada é **Deck & Archetype Intelligence / AI Debugger**, usando esses metadados para explicar decisões e adaptar prioridades ao estilo do deck.
