# Battle Spirits Eternal Simulator

> Build atual do pacote: **v3.2.1** — Match Stability & AI Readiness

Versão estável da linha **v3**, agora com foco em estabilidade de partida, arquitetura para IA e consolidação da Arena atual.

A identidade continua monocromática, com **Cores regulares azuis** e **Soul Core vermelha**. A v3.2.x passa a priorizar automação de regras e efeitos sem mover lógica para componentes visuais.

> **Database Image Hotfix:** a revisão atual também corrige cartas que apareciam com o verso genérico nas páginas finais da Database. As 365 artes já estavam presentes; o problema era a herança do caminho de imagem quando arquivos específicos de deck sobrescreviam o catálogo consolidado.



## Destaques da v3.2.1
- Nova API `getLegalActions(match, playerId, cardIndex)` para enumerar jogadas válidas a partir da Rules Engine.
- Action Log estruturado para replay, depuração e futura IA.
- Validação de integridade do estado da partida após ações bem-sucedidas.
- Snapshots e replay de ações como base para save/load e reprodução de bugs.
- Seed opcional para shuffle inicial e Mulligan determinísticos.
- Layout visual da Arena consolidado em `src/styles/arena/arenaLayoutV321.css`, preservando o wallpaper e ajustes manuais atuais.
- Suite automatizada expandida para **76 testes**.

## Destaques da v3.2.0
- Nova janela automática de Burst para condições **Após sua Life diminuir** detectadas em ataques não bloqueados.
- O jogador pode **Ativar Burst** ou **Passar** antes de a partida continuar.
- Mirages passam a disparar operações estruturadas no momento do Set.
- Effect Engine ganhou suporte a `setTurnProtection` e `discardOpponentSetBurst`.
- Um teste de cobertura garante que todos os tipos de operações estruturadas da database atual sejam reconhecidos pela Engine.
- Reserve e Core Trash ficaram mais limpos: removidas as caixas **Origem do pagamento** e **Pago X/Y**.
- Suite automatizada: **71/71 testes**.

## Destaques da v3.1.9
- Cores da Reserve agora podem ser **clicados ou arrastados** durante pagamentos.
- Clique inteligente: primeiro paga o custo; depois adiciona Cores à carta pendente para o Lv mínimo e níveis maiores.
- Clique em Core Trash durante pagamento desfaz um Core pago.
- No Main Step, selecione uma carta sua e clique em Cores da Reserve para adicioná-los rapidamente.
- Hover/zoom mais rápido e posicionado ao lado da carta.
- Feedback de drag/drop e animação de entrada da mão refinados.

## Destaques da v3.1.8

- Custo base, redução e custo final mais legíveis durante invocações e Magic.
- Progresso de pagamento e Cores mínimos com feedback claro.
- Reserve/Core Trash receberam orientação contextual durante pagamentos nesta versão; essas caixas foram removidas novamente na v3.2.0 para limpar a Arena.
- Ataque possui ligação visual até bloqueador ou Life.
- Flash Timing e Block Step mais claros sem alterar regras.

## Destaques da v3.1.7

- Cartas em campo com tamanho e espaçamento refinados, sem clipping nas zonas.
- LV e BP externos continuam legíveis mesmo quando a carta está Exhausted.
- Brave combinado aparece atrás do host com melhor separação visual e tag menor.
- Glow de raridades altas segue a cor principal da carta sem cobrir a arte.
- Atacante, bloqueador e bloqueadores legais recebem feedback visual derivado da Rules Engine.
- Seleção no campo usa sombra sutil, sem moldura branca ao redor da carta.
- Botões de Voltar e destaques coloridos de informações continuam com a identidade preto e branco da linha v3.1.x.
- O botão Contra IA permanece preparado, mas inativo, para implementação futura.

## Início rápido

```powershell
npm install
npm run verify
npm test
npm run build
npm run dev:web
```

Para o aplicativo Electron:

```powershell
npm run dev
```

Os atalhos `.bat` ficam em `scripts/windows/`.

## O que mudou na v3.1.4

- Projeto reorganizado em pastas menores e mais previsíveis.
- Telas React carregadas sob demanda para reduzir o trabalho inicial do navegador.
- Imagens de cartas auditadas: a database atual usa artes de alta resolução; a conversão para PNG/JPG não foi feita porque não criaria detalhe novo e aumentaria o tamanho do projeto.
- Cartas da mão/campo usam a proporção real das artes e evitam ampliação por CSS transform, reduzindo borrões.
- Seleção azul acidental de textos/imagens desativada na interface do simulador.
- Arraste de **cartas** trocado por Pointer Events: sem drag ghost translúcido e sem cursor de bloqueio do HTML Drag & Drop.
- Drop de cartas integrado a Campo, Burst, Trash, Mão e Deck/Topo/Fundo quando a ação correspondente é válida.
- Cores continuam usando o sistema de drag existente; a mudança de v3.1.4 é focada no arraste de cartas.

## Estrutura principal

```text
src/
├── components/
│   ├── cards/       componentes de cartas
│   ├── common/      modais, estados vazios, componentes genéricos
│   ├── game/        HUD, Cores e fases
│   └── home/        componentes exclusivos da Home
├── game/            Rules Engine e estado da partida
├── interactions/    interações de mouse/pointer da interface
├── pages/           telas principais
├── services/        storage, database, desktop, tema, online
├── styles/
│   ├── arena/
│   ├── base/
│   ├── cards/
│   ├── deckbuilder/
│   ├── pages/
│   └── theme/
└── data/            JSONs carregados pela aplicação

public/
├── cards-database/  artes por coleção
├── images/          assets da interface
└── config/          configuração web/online

docs/
├── changelog/
├── validation/
├── archive/
├── deployment/
└── online/

scripts/
├── windows/         atalhos .bat
└── *.mjs            scripts de build/verificação
```

Veja `docs/PROJECT-STRUCTURE.md` para detalhes.

## Qualidade das imagens

As cartas atuais possuem resolução mínima de **675×983 px**. Isso já é muito superior ao tamanho em que as cartas aparecem na mão e no campo.

Use:

```powershell
npm run verify
```

para também rodar a auditoria das imagens. Caso uma arte futura tenha resolução muito baixa ou esteja corrompida, o script avisa.

## Online

A URL do servidor continua isolada em:

```text
public/config/online-config.js
```

Ferramentas relacionadas ficam em `scripts/windows/` e `tools/`.

## Rules Engine

A pasta `src/game/` continua sendo a fonte de verdade para Local e Online. A reorganização visual da v3.1.4 não substitui as regras por lógica de UI.

## Aviso

Battle Spirits e suas propriedades pertencem à BANDAI. Este é um projeto de fã não oficial, sem fins lucrativos e voltado à comunidade.
