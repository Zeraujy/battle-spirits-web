# Battle Spirits Eternal Simulator v3.2.1 — Match Stability & AI Readiness

## Rules Engine / arquitetura
- Adicionada `getLegalActions(match, playerId, cardIndex)` para enumerar ações legais usando as validações já existentes da engine.
- Adicionado Action Log estruturado com sequência, ator, fase anterior/posterior e payload da ação.
- Adicionado validador de integridade do estado da partida.
- Adicionados snapshots, restauração, serialização e replay do Action Log.
- Adicionado RNG determinístico opcional por seed para shuffle inicial e Mulligan.
- Adicionado helper de debug com ações legais e relatório de integridade.

## Arena
- Hotfixes visuais acumulados da v3.2.0b–h e ajustes manuais foram consolidados em `arenaLayoutV321.css`.
- Mantidos o wallpaper personalizado, zonas de campo invisíveis, títulos discretos e layout atual dos Decks/mãos.
- Caminho do wallpaper foi normalizado para `/images/arena/wallpaper_arena_default.png`.

## Versão / validação
- `package.json` e `package-lock.json` atualizados para 3.2.1.
- Home, Configurações, Simulator, Deck Builder, scripts e documentação sincronizados para 3.2.1.
- Suite ampliada de 71 para 76 testes automatizados.

## Hotfix Online / Matchmaking
- Corrigido o fluxo de **Procurar Partida**: o servidor agora implementa a fila e o pareamento de matchmaking.
- O host cria a sala automaticamente, o segundo jogador entra pela sala criada e a partida inicia após a confirmação dos dois clientes.
- Adicionada limpeza da fila em cancelamento, desconexão e timeout para evitar buscas presas.
- O bridge Online do Electron agora aceita e encaminha os eventos `matchmaking:*`, mantendo a busca rápida funcional também no desktop.
- O endpoint `/health` agora informa `matchmakingQueued` e `matchmakingPairs` para facilitar diagnóstico do servidor.

## Eternal CPU Beta 2
- Reativado o modo **Contra IA** na Home, com tela própria para escolher o deck do jogador, o deck da CPU e as dificuldades Fácil, Normal e Difícil.
- A nova CPU escolhe exclusivamente ações retornadas por `getLegalActions()`, usando a mesma Rules Engine e o mesmo `applyGameAction()` das partidas local e online.
- A avaliação da CPU considera Life, BP, recursos, presença de campo, ataque, bloqueio, Burst, Mirage, Brave, Magic e decisões de efeito que já possuem resolução automática.
- A avaliação do oponente usa apenas informações públicas e contagens de zonas ocultas; a identidade das cartas na mão do adversário não é usada para escolher a jogada.
- Adicionado controle contra loops de ações de Brave/Mirage e limite de progressão para impedir turnos presos.
- No modo IA, o jogador humano permanece visualmente na parte inferior da Arena e os controles da CPU ficam bloqueados durante o pensamento dela.
- Adicionado indicador **CPU pensando…** e pequenos atrasos entre ações para deixar a sequência de jogadas legível.
- Adicionados 6 testes automatizados específicos da IA: ação legal, ataque letal, bloqueio letal, privacidade da mão adversária, decisão determinística por seed e simulação IA vs IA.
- Suite total ampliada de **76 para 82 testes**.
