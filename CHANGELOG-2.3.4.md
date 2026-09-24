# Battle Spirits Simulator 2.3.4

## Hotfix — conexão pública estável

- Cliente online passa a usar somente HTTP long-polling no Socket.IO.
- Upgrade automático para WebSocket foi desativado temporariamente.
- Servidor público também aceita somente polling para evitar `transport close` no Render.
- Reconexão automática permanece ativa com tentativas ilimitadas.
- Timeout de conexão aumentado para 30 segundos, ajudando quando a instância gratuita do Render está acordando.
- `localhost:3001` continua compatível para testes locais usando o mesmo transporte.

Este hotfix não altera regras, cartas, decks, perfil, database nem estado de jogo.
