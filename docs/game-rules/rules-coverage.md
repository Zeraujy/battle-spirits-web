# Cobertura de regras — Eternal

Alvo estrutural: Battle Spirits **Eternal**, manual japonês atual da linha 17.x. A constante do cliente está configurada para `17.1`.

## Base já automatizada

- Setup 1v1: 5 Life, 3 Cores regulares + Soul Core na Reserve e 4 cartas iniciais.
- Mulligan inicial de uma vez por jogador.
- Deck 40+ e regra geral de até 3 cartas com o mesmo nome.
- Fases Eternal: Start → Core → Draw → Refresh → Main → Attack → End.
- Primeiro jogador: sem ganho do Core Step e sem Attack Step no primeiro turno.
- Refresh de cartas, Core Trash e Soul Core.
- Custo e Reduction Symbols conforme símbolos no campo.
- Pagamento usando Reserve e Cores permitidos no campo.
- Soul Core como Core para custo/movimentação.
- Movimento manual de Core durante o Main, com Reserve/Core Trash e Cores sobre cartas.
- Pagamento manual pendente para Summon/Deploy, Magic e Mirage; Lv/BP é recalculado conforme os Cores atuais.
- Depletion separado de Destroy.
- Summon de Spirit, Ultimate e Brave em estado de Spirit.
- Colocação de Nexus.
- Grandwalker/Grandstone Nexus: Cores bloqueados para pagamento/movimentação normal (efeitos próprios continuam via handlers).
- Brave regular: Spirit State, Direct Combine, Combine, Separate e Exchange; estatísticas combinadas (BP/símbolos) e estado Exhausted.
- Attack declaration e Exhaust.
- Flash Timing 1, Block declaration, Flash Timing 2 e resolução.
- Prioridade de Flash alternada; dois passes consecutivos encerram o timing.
- Dano à Life pelo número de símbolos do atacante.
- Comparação de BP e destruição em empate.
- Magic Main/Flash com custo.
- Ultimate: Summoning Condition estruturada (com fallback de confirmação) e resolução base de U-Trigger (revelar, Trash, HIT/GUARD).
- Burst: set (incluindo substituição), limite de Set por turno e ativação com confirmação de condição; efeito estruturado quando disponível.
- Mirage: Set separado da Burst, custo/reduction próprios, substituição da Mirage anterior e limite de Set por turno.
- Estado secreto online para Hand/Burst adversários.
- Chat sincronizado por sala no servidor online.
- Resolução manual para efeitos ainda não automatizados.

## Estrutura pronta, mas depende do cadastro da carta / handler específico

Battle Spirits Eternal inclui uma quantidade muito grande de mecânicas e exceções históricas. Entre elas: Ultimate Trigger, Burst conditions e pós-Burst, Imagin/Saga Brave, Grandwalker/Grandstone/Contract Nexus, efeitos contínuos/ativados de Mirage, Seal, Kourin/Contract Kourin, Tensei, Contract Cards, Apparition, Tokens, Soul Magic, armor variants, immunity/target restrictions, replacement effects, effect queues e Q&As específicas.

Essas mecânicas **não devem ser interpretadas automaticamente a partir de texto livre**. Para serem 100% automáticas, cada uma precisa de representação estruturada e testes. Até o handler existir, o jogador pode executar a resolução pelo painel manual sem quebrar a partida.

## Filosofia da engine

1. Regras gerais ficam em funções puras (`src/game`).
2. Toda ação passa por `applyGameAction`.
3. O online usa o mesmo reducer no servidor; o cliente não decide o resultado.
4. Uma carta desconhecida nunca deve corromper o estado da partida.
5. Efeitos automatizados precisam ser determinísticos e testáveis.
6. Q&As específicas podem virar handlers por card ID sem contaminar as regras gerais.

## Próximos handlers recomendados

Para os decks antigos que já usamos no projeto, a prioridade natural é:

1. Burst trigger queue e follow-up de Magic.
2. Efeitos de HIT específicos de cada U-Trigger e Trigger Counter.
3. Imagin/Saga Brave e exceções históricas de Brave.
4. Keywords presentes em SD10 / SD17 e nos decks que você adicionar depois.
5. Contract/Kourin/Tensei/Seal/Tokens e demais mecânicas modernas conforme os sets forem importados.
