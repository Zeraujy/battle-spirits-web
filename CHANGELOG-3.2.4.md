# Battle Spirits Eternal Simulator v3.2.4

## CPU — Flash, Magic & Burst Intelligence

- A Eternal CPU agora diferencia corretamente efeitos **Main** e **Flash** em cartas com timing estruturado.
- Durante o Main Step, uma Magic pode expor separadamente sua ação Main e sua ação Flash quando a carta realmente possui esses timings.
- Cartas antigas ainda sem `effects`/`abilities` estruturados continuam disponíveis para resolução manual, preservando compatibilidade com a database em expansão.
- A CPU pré-visualiza decisões estruturadas de alvo antes de gastar uma Magic e evita usar respostas sem alvo ou sem ganho útil.
- Em Flash Timing, a avaliação considera risco de lethal, vantagem/desvantagem de BP e o custo de gastar uma resposta que poderia ser preservada.
- Fora de combate, Flash defensivo recebe valor de reserva: a CPU ainda pode usá-lo no Main Step quando o ganho imediato for forte, mas evita desperdiçá-lo.

## Burst

- `lifeDecrease`, `lifeReduced` e `afterLifeReduced` agora são normalizados para a mesma janela automática `burstLifeDecrease`.
- A CPU dá prioridade de Set Burst às condições automáticas que consegue verificar sem confirmação humana.
- Condições de Burst ainda exclusivamente manuais recebem prioridade menor na CPU, sem serem removidas do jogo para jogadores humanos.
- Em uma janela de Burst, a CPU compara **ACTIVATE_BURST** e **PASS_BURST** usando o estado resultante e as escolhas estruturadas de alvo.
- Se a Burst não possuir alvo legal ou o efeito não compensar, a CPU pode passar e manter a carta setada.

## Rules Engine

- Toda ação continua vindo de `getLegalActions()` e passando por `applyGameAction()`.
- A IA não ignora custos, timings ou condições de jogo.
- A identidade da mão oculta do oponente continua fora da avaliação da CPU.

## Validação

- `npm run verify`: OK.
- `npm run verify:v3`: OK.
- `npm test`: **96/96** testes passando.
- 365 IDs únicos e 365/365 referências de artwork válidas.
- Simulação Hard CPU vs Hard CPU com SD23 vs SD28: **317 ações, 22 turnos, vitória normal por Life, 0 ações ilegais**.
- A simulação exercitou Set Burst, PASS_BURST, USE_MAGIC em Flash, bloqueios, Ultimate Trigger e decisões de combate.
