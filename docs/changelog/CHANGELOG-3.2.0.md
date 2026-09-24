# Battle Spirits Eternal Simulator v3.2.0 — Rules & Effects Expansion

Data: 23/09/2026

## Objetivo da versão
A v3.2.0 inicia a fase de expansão da Rules Engine. O foco é automatizar mais efeitos já estruturados na database, reduzir resolução manual e manter a Arena fluida e fiel à identidade monocromática do simulador.

## Burst
- Adicionada uma janela de Burst real para cartas com condição **Após sua Life diminuir**.
- A condição é detectada automaticamente quando um ataque não bloqueado reduz a Life do defensor.
- A partida pausa nesse timing até o jogador escolher **Ativar Burst** ou **Passar**.
- A ativação automática usa o evento estruturado `burstLifeDecrease`.
- Ao ativar, a Burst sai da zona setada e vai ao Trash após a resolução, como antes.
- Bursts com condições ainda não automatizadas continuam disponíveis pelo fluxo de confirmação manual existente.

## Mirage
- Ao setar uma Mirage, a Effect Engine agora dispara o timing estruturado `mirage`.
- Operações estruturadas ligadas ao momento do Set podem ser resolvidas automaticamente.
- Custos, redução e limite de uma ação de Set Mirage por turno continuam validados pela Rules Engine.

## Effect Engine
- Adicionado suporte a `setTurnProtection`.
- Implementado `limitSpiritAttackLifeDamage`, usado por efeitos que limitam quanto um ataque de Spirit pode reduzir da Life durante o turno.
- Adicionado suporte a `discardOpponentSetBurst`, enviando a Burst setada do oponente ao Trash.
- Criada função de cobertura para identificar tipos de operações estruturadas reconhecidos pela Engine.
- Novo teste varre a database atual e falha se surgir uma operação estruturada sem suporte conhecido.
- Todos os **22 tipos de operação estruturada atualmente presentes na database** são reconhecidos pela Engine.

## Arena / UX
- Removida da Reserve a caixa **ORIGEM DO PAGAMENTO / PAYMENT SOURCE**.
- Removida do Core Trash a caixa **PAGO X/Y / PAID X/Y**.
- O progresso de custo e Cores mínimos permanece no painel da jogada pendente.
- A janela de Burst usa um painel compacto e monocromático com **Ativar Burst** e **Passar**.

## Organização
Novos arquivos principais:
- `src/game/burstRules.js` — detecção e controle das janelas automáticas de Burst.
- `src/game/databaseEffectCoverage.test.js` — auditoria dos tipos de operações estruturadas da database.
- `src/styles/arena/rulesEffectsV320.css` — apresentação visual específica da v3.2.0.

A lógica de regra permanece em `src/game/`; React e CSS apenas apresentam estado e decisões produzidas pela Engine.

## Validação
- `npm run verify`: OK
- `npm run verify:v3`: OK
- Database runtime: 365 cartas únicas
- Artes: 365/365 referências válidas
- `npm test`: **71/71 testes passando**
- `vite build`: não executado neste ambiente porque o executável local do Vite não está disponível no `node_modules` materializado.
