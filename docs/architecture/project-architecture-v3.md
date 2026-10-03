# Arquitetura Web + Online

A aplicação possui uma única arquitetura oficial:

- `src/`: frontend React.
- `public/`: assets públicos e configuração carregada pelo navegador.
- `server/`: servidor multiplayer Node.js + Socket.IO, publicado separadamente.
- `supabase/`: migrações e políticas dos recursos cloud.
- `scripts/`: validação, auditoria, catálogo e publicação.
- `docs/`: documentação ativa do projeto.

A URL do servidor Online pode ser definida por `VITE_ONLINE_SERVER_URL` durante o build ou por `public/config/online-config.js` em runtime.
