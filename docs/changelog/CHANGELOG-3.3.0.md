# Battle Spirits Eternal Simulator v3.3.0

## CPU — Planning / Lookahead

### Planejamento multi-ação
- Adicionado `rankAIPlans()` em `src/game/ai.js`.
- Normal compara a ação atual com uma continuação futura.
- Hard usa um horizonte maior e pode comparar até três decisões futuras além da ação raiz.
- A busca usa beam search limitado e orçamento determinístico de nós para manter desempenho previsível.
- Ações de progresso como Main → Attack permanecem candidatas no planejamento mesmo quando o score imediato é menor.

### Replanejamento e segurança
- Somente a primeira ação do plano é realmente executada.
- A CPU recalcula o plano após cada resolução real, Trigger, Burst, escolha de alvo ou mudança de fase.
- A busca termina quando o controle passa ao adversário.
- Mudanças que consomem cartas do deck encerram o horizonte atual para impedir previsão baseada em informação ainda oculta.
- O score de uma compra não usa a identidade específica da carta ainda desconhecida.

### Diagnóstico
- Planos ranqueados podem expor `planScore`, `planBonus`, `planDepth`, `planNodes` e `planActions`.
- Esses metadados preparam o futuro AI Debugger visual.

### Validação
- 108/108 testes automatizados passando.
- Novos testes cobrem lethal através de mudança de fase, legalidade da sequência, profundidade por dificuldade, determinismo e privacidade de informação futura.
- Simulação SD23 vs SD28 (Hard vs Hard): 86 ações, 5 turnos, término normal por Life e nenhuma ação ilegal.
