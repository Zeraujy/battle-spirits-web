# Auditoria de Release — v4.1.0

## Card Database Expansion Framework
- Runtime atualizado para carregar JSONs recursivamente em `src/data/**`.
- Compatibilidade preservada com todos os arquivos antigos em `src/data/`.
- Pasta `src/data/sets/` preparada para novos sets independentes.
- Importador testado em dry-run e em fluxo real com set temporário.
- IDs duplicados e colisões com o catálogo existente são bloqueados.
- Manifesto leve do catálogo é sincronizado por script.
- Texto livre de efeitos não é convertido automaticamente em lógica de jogo.

## Validação
- 142/142 testes automatizados aprovados.
- 365 cartas únicas após restauração do catálogo original.
- 382 artes WebP verificadas.
- 0 referências de arte ausentes em runtime.
- UI audit: aprovado.
- Release audit: aprovado.
- Verificador estrutural: aprovado.

## Limpeza
Pacote final sem `.git`, `node_modules`, `dist`, `release`, `.env` privados, logs, caches, backups ou staging `card-imports/`.
