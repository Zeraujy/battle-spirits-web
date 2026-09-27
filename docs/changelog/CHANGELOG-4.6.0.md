# Battle Spirits Eternal Simulator v4.6.0

## Desktop Hardening

- Builds Desktop para Windows, macOS e Linux continuam sincronizadas com a mesma versão Web.
- Scripts Desktop usam `NODE_ENV=production`.
- DevTools são desativadas em builds empacotadas, com bloqueio adicional de F12 e atalhos de inspeção.
- Renderer e runtime Electron são minificados sem sourcemaps.
- O pacote final usa `app.asar`; `src/`, `server/`, fontes Electron originais e arquivos `.env` não são distribuídos.
- Configurações públicas necessárias ao cliente permanecem dentro do ASAR.

## Backend / Privacy

- Adicionada `supabase/SECURITY-4.6.0.sql`.
- RLS reforçada em wallet, coleção, ledger, progresso e demais dados privados do jogador.
- Operações críticas de economia não possuem escrita direta pelo cliente.
- Admin é validado pela sessão autenticada no banco; nenhuma flag enviada pelo cliente concede privilégios.
- Ranked settlement permanece exclusivo do backend com `service_role`.
- Auditorias automáticas verificam secrets e postura do pacote Desktop.

> ASAR, minificação e bloqueio de DevTools aumentam a dificuldade de inspeção casual, mas não substituem segurança server-side e não tornam código cliente impossível de extrair/reverter.
