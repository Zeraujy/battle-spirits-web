# Release Audit — Battle Spirits Eternal Simulator v4.0.0

## Integridade
- Testes: 138/138 aprovados.
- Estrutura: verificada por `verify-project.mjs` e `verify-v3.mjs`.
- Catálogo runtime: 365 cartas únicas.
- Artes WebP verificadas: 382.
- Referências de arte ausentes: 0.
- Imports relativos quebrados: 0.
- Parse estático de JS/JSX/MJS/CJS: aprovado.

## UX / Ranked
- Ranked reorganizado em stack vertical próprio para impedir colisão entre VS, estatísticas e histórico.
- Breakpoints dedicados: 1050px, 760px e 520px, além de ajuste para telas desktop de baixa altura.
- Ações redundantes de troca de deck foram consolidadas.
- Estado vazio de histórico adicionado.
- Estado de conexão visível sem expor detalhes de infraestrutura.

## Limpeza
O release final não deve conter:
- `.git`
- `node_modules`
- `dist`
- `release`
- `.env` privados
- caches
- logs
- arquivos temporários ou backups

## Informações internas
`release:audit` e `ui:audit` foram executados com sucesso. O frontend player-facing não recebeu detalhes de backend, nomes de credenciais, caminhos internos ou instruções de desenvolvimento.
