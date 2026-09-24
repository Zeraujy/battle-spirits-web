# Battle Spirits Eternal Simulator v3.2.5

## CPU — Card Effect Intelligence

### Nova camada semântica
- Adicionado `src/game/aiEffectSemantics.js`.
- A CPU passa a medir o impacto estratégico específico de efeitos estruturados, além do score genérico do estado final.
- Remoções de campo distinguem destruição, retorno à mão e retorno ao deck.
- Exhaust/Refresh consideram o valor do corpo afetado e a relevância de atacante/bloqueador.
- Modificações de BP recebem peso contextual maior durante a batalha.
- Compra/recuperação, geração de Core, Life, proteções e restrições também entram no score.

### Decision Queue
- Escolhas pendentes passam a usar o score semântico antes de confirmar alvo/opção.
- A CPU prefere ameaças mais valiosas para Exhaust, bounce e destruição quando múltiplos alvos são legais.
- Buffs de BP priorizam o corpo envolvido na batalha quando o ganho é relevante.
- `rankAIActions()` agora expõe `effectScore` e `effectReasons` para diagnóstico futuro.

### Privacidade e regras
- A CPU continua sem consultar a identidade das cartas ocultas do adversário.
- Toda decisão continua vindo de `getLegalActions()` e sendo executada por `applyGameAction()`.
- Nenhuma regra paralela foi adicionada à IA.

### Validação
- 102/102 testes automatizados passando.
- Novos testes cobrem Exhaust, Refresh, retorno à mão, BP contextual, Draw/Core e privacidade de informação oculta.
- Simulação SD23 vs SD28 (Hard vs Hard): 240 ações, 18 turnos, término normal por Life e nenhuma ação ilegal.
