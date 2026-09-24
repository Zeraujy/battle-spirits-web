# Estrutura do projeto — v3.2.0

## Regra principal

**UI não decide regras do Battle Spirits.** Componentes podem pedir uma ação, mas quem valida e altera a partida é `src/game/`.

## `src/components`

- `cards/`: componentes que desenham ou descrevem cartas.
- `game/`: HUD, Cores e elementos compartilhados da partida.
- `common/`: componentes genéricos.
- `home/`: componentes exclusivos da tela inicial.

## `src/interactions`

Interações específicas da interface que não pertencem à Rules Engine. O arraste de cartas por Pointer Events fica aqui para não misturar DOM com regras.

## `src/game`

Engine da partida. Alterações aqui devem vir acompanhadas de testes sempre que possível.

Arquivos de referência da v3.2.0:
- `burstRules.js`: timings e janela de Burst.
- `effectEngine/`: resolução estruturada de efeitos e decisões.
- `databaseEffectCoverage.test.js`: garante que operações estruturadas novas não entrem na database sem cobertura conhecida.


## `src/styles`

CSS separado por domínio, evitando um único arquivo gigante:

- `base/`: estilos globais e identidade base.
- `arena/`: mesa, batalha e painéis do simulador.
- `cards/`: detalhes e apresentação ampliada de cartas.
- `deckbuilder/`: Deck Builder e biblioteca.
- `pages/`: telas específicas.
- `theme/`: Home, temas e elementos transversais.

## `public/cards-database`

As imagens devem continuar separadas por coleção. O JSON de cada carta aponta para a arte correspondente.

A linha v3 mantém WebP porque as artes já possuem alta resolução. Converter WebP para PNG/JPG não recupera informação perdida e aumenta armazenamento/tráfego.

## `scripts`

- `scripts/windows/`: comandos de conveniência para Windows.
- scripts `.mjs`: verificações, migrações e build.

## `docs`

Histórico e material antigo não fica mais solto na raiz. Changelogs, validações, deploy e documentos arquivados possuem subpastas próprias.
