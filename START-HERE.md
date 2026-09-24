# START HERE — v3.2.2

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

A próxima etapa planejada é **Core & Resource Management**, sem mover regras de custo para a IA.
