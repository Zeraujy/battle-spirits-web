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
