# v3.3.1e — Online Account Compatibility Fix

Data: 24/09/2026

## Corrigido

- Contas logadas não enviam mais o objeto completo de perfil ao Socket.IO.
- Salas privadas e matchmaking usam uma identidade pública mínima: nome, username, cor e avatar compacto.
- `banner`, `bio` e demais campos locais/da conta não são enviados ao servidor de partidas.
- Avatares em Data URL acima do orçamento são reduzidos no navegador para até 128 px.
- Caso um avatar não possa ser reduzido com segurança, a partida continua sem avatar em vez de derrubar a conexão.
- O cliente bloqueia payloads de perfil exagerados antes do `socket.emit`.
- O servidor sanitiza novamente o perfil e limita o buffer do Socket.IO a 512 KiB.

## Mantido

- Matchmaking e salas privadas continuam usando o mesmo Rules Engine.
- Nenhuma mudança nas regras de Battle Spirits, IA, database ou sistema de decks.
- Gerenciador automático, otimizações de imagem e placeholder de verso permanecem ativos.
