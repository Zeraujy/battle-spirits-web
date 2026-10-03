# Otimizações da v3.1.3

## Carregamento

As páginas são importadas com `React.lazy`, portanto Home não precisa analisar Simulator, Deck Builder, Lobby e demais telas antes de o usuário realmente acessá-las.

A Home usa um manifesto leve para exibir a quantidade de cartas sem importar a database inteira.

## Cartas

- fonte atual: 675×983/984 px;
- `object-fit: contain` preserva o frame inteiro;
- proporção CSS `675 / 983` evita deformação/corte;
- `image-rendering: auto` deixa o Chromium usar filtragem de alta qualidade;
- imagens não são ampliadas por `scale()` no hover da mão/campo;
- `decoding="async"` evita bloquear a thread principal durante decodificação.

## Arraste

Cartas não usam mais HTML Drag & Drop nativo. O sistema Pointer Events:

- mantém a carta original opaca;
- renderiza um preview próprio;
- evita o cursor `not-allowed` do navegador;
- permite destacar destinos válidos;
- funciona com mouse, caneta e futuros ajustes de touch sem reescrever a base.
