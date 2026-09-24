# Battle Spirits Eternal Simulator v3.3.1

## Archetype Intelligence & AI Debugger

### Deck & Archetype Intelligence
- Novo módulo `src/game/aiArchetypes.js`.
- A Eternal CPU analisa a decklist conhecida antes da partida e cria afinidades para:
  - Agressivo
  - Controle
  - Defensivo
  - Ultimate
  - Brave
  - Recursos
  - Equilibrado
- Perfis podem ser híbridos. Na database atual:
  - SD23 Eris: **Ultimate / Controle**
  - SD28 Land of Deep Green: **Ultimate / Brave**
- Os pesos de arquétipo influenciam ataque, bloqueio, Magic, Burst, Nexus, Ultimate, Brave e gerenciamento de recursos.
- O perfil pré-calculado fica salvo em `match.ai.archetypeProfile`.
- Sem perfil pré-calculado, a IA usa Equilibrado e não tenta inferir estratégia olhando a ordem escondida do deck.

### AI Debugger
- A tela Contra IA mostra o estilo detectado e as três maiores afinidades antes da partida.
- Novo modo opcional **AI Debugger**.
- O painel na Arena mostra:
  - ação escolhida;
  - score total;
  - score imediato;
  - bônus de Lookahead;
  - peso do arquétipo;
  - score semântico de efeitos;
  - linha prevista;
  - cinco melhores alternativas.
- O debugger usa exatamente a mesma decisão que será executada pela CPU.
- Novo `chooseAIDecision()` expõe os metadados da decisão mantendo `chooseAIAction()` compatível.

### Segurança e regras
- Os pesos de arquétipo só reordenam ações já expostas por `getLegalActions()`.
- Toda ação continua passando por `applyGameAction()`.
- A IA continua sem usar a identidade da mão oculta do oponente.
- O Lookahead continua interrompendo a busca ao cruzar fronteiras de informação ainda não revelada.

### Validação
- **112/112 testes** passando.
- `npm run verify`: OK.
- `npm run verify:v3`: OK.
- 365/365 referências de artwork válidas.
- Simulação real Hard vs Hard:
  - SD23 Eris vs SD28 Land of Deep Green;
  - 93 ações;
  - 5 turnos;
  - 0 ações ilegais;
  - término normal por Life.
