# Battle Spirits 2.3.3 — Public Online Hotfix

- Corrige conexão Socket.IO em hospedagens públicas/reverse proxy.
- Cliente volta a usar o fluxo padrão do Socket.IO: polling primeiro e upgrade automático para WebSocket.
- Remove a preferência anterior que forçava WebSocket como primeiro transporte.
- Normaliza a URL do servidor e remove `/health` caso seja colado por engano.
- Reconexão com backoff e timeout explícitos.
- Servidor ganha logs de conexão, upgrade, desconexão e erros do Engine.IO para facilitar diagnóstico no Render.
- Mantém suporte local em `http://localhost:3001`.
