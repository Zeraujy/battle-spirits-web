# Battle Spirits Eternal Simulator v3.1.3

## Organização

- Componentes separados em `cards`, `common`, `game` e `home`.
- CSS separado em `arena`, `base`, `cards`, `deckbuilder`, `pages` e `theme`.
- Changelogs, validações, arquivos antigos e scripts Windows movidos para pastas dedicadas.
- Adicionado `START-HERE.md` e documentação de estrutura/otimização.

## Qualidade visual

- Proporção das cartas corrigida para corresponder aos arquivos 675×983.
- Imagens de mão/campo passam a usar `object-fit: contain` e renderização automática de alta qualidade.
- Ampliação por `scale()` removida dos hovers principais da mão/campo para evitar rasterização borrada.
- Cartas ligeiramente maiores no layout desktop principal.
- Auditoria confirmou que todas as imagens usadas na database estão acima do limite mínimo definido.

## Interação

- Seleção azul acidental desativada na interface.
- Imagens não podem mais ser arrastadas pelo navegador.
- Novo drag de cartas baseado em Pointer Events.
- Preview de drag próprio, opaco e nítido.
- Suporte de drop para Campo, Burst, Trash, Mão e Deck (Topo/Fundo), respeitando as ações da engine quando aplicável.

## Performance

- Páginas principais carregadas sob demanda com `React.lazy`.
- Home deixou de importar a database completa apenas para exibir a contagem de cartas.
- Assets duplicados não utilizados de SD17-X01 foram removidos.

## Hotfix de build pós-validação no Windows

- Corrigido o caminho relativo de `scrollbars.css` em `src/styles/deckbuilder/prebuiltDecks.css` após a reorganização das folhas de estilo.
- `npm run verify` agora também valida `@import` locais de CSS, evitando que um caminho quebrado passe pela checagem estrutural e só apareça no `vite build`.
- Nenhuma regra de jogo, database ou comportamento da Rules Engine foi alterado por este hotfix.
