# Battle Spirits 2.3.10 — Online Stable

Esta versão é um pacote completo baseado na linha 2.3.x, preservando gameplay, interface, contas, perfis, decks, temas, Reserve/Core Trash manuais, revelação, Void → Core, chat e demais mecânicas já presentes na base.

## Online
- Retorna a estratégia de transporte Socket.IO da base 2.0.x: WebSocket preferencial + fallback para polling.
- Remove o bloqueio de polling-only introduzido nos hotfixes posteriores.
- Mantém room:create, room:join, room:resume, room:start, game:action e room:chat modernos.
- Mantém proteção do servidor contra exceções e sanitização de informações privadas.
- O Electron empacotado volta a carregar `dist/index.html` por `file://`, como na base 2.0.x que funcionou online no executável.

## Compatibilidade
- Não altera a engine de regras.
- Mantém os dados do jogador em AppData.
- Mantém Updater.exe e Server.exe.
