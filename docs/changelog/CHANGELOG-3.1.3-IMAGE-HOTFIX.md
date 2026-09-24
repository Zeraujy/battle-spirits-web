# Battle Spirits Eternal Simulator v3.1.3 — Database Image Hotfix

## Correção principal

Algumas cartas da Database apareciam com o verso genérico a partir das páginas finais do catálogo, apesar de suas artes estarem presentes em `public/cards-database/`.

### Causa

O catálogo consolidado `src/data/cards.json` possui os caminhos das artes. Alguns arquivos específicos de deck/coleção (`SD13.json`, `SD15.json`, `SD23.json`, `SD28.json`) sobrescrevem cartas com dados de regras mais completos, mas não repetem o campo `image`.

O `cardRepository` substituía o registro inteiro pelo override mais recente. Isso removia o caminho da arte e fazia `resolveCardImage()` retornar `card-back.webp`.

### Solução

- `src/services/cardRepository.js` agora preserva a arte já conhecida quando um override da mesma ID não declara uma nova imagem.
- A regra continua permitindo que um arquivo posterior troque a arte quando ele realmente fornecer `image`.
- Nenhuma imagem precisou ser baixada: todas as 365 artes já estavam presentes no projeto.
- Foi adicionado `scripts/audit-runtime-card-references.mjs` para verificar as referências de imagem que o catálogo final usa em runtime.
- `npm run verify` agora executa também essa auditoria.

## Resultado da auditoria

- 365 cartas únicas em runtime.
- 365 cartas com referência de arte válida.
- 0 arquivos de arte ausentes.
- 70 registros de regras herdam corretamente a arte do catálogo consolidado.
- 60/60 testes da Rules Engine continuam passando.
