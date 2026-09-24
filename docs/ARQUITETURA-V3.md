# Arquitetura — Battle Spirits Eternal Simulator v3

O Rebuild v3 separa o projeto em quatro responsabilidades. `src/game` contém regras e estado compartilhados; `src/pages` e `src/components` cuidam da interface; `src/online` cuida apenas do transporte/reconexão; `server` mantém salas, identidade de sessão e encaminhamento de ações. A intenção é impedir que uma correção de interface altere regras e evitar uma implementação diferente da mesma regra no Local e no Online.

## Fluxo da partida

Tanto o modo Local quanto o servidor Online usam `createMatch()` e `applyGameAction()` do mesmo núcleo. O cliente Online não decide regras autoritativas: ele envia ações, e o servidor aplica a reducer compartilhada e redistribui o estado sanitizado para cada jogador.

## Configuração Online

A URL não deve ser colocada em `OnlineLobby.jsx`. O único arquivo destinado à troca manual é `public/config/online-config.js`. Ele é carregado pelo `index.html` antes do React e lido por `src/config/online.js`.

Também existe a variável `VITE_ONLINE_SERVER_URL`, que tem prioridade durante builds automatizados. Para manutenção normal no Windows, use `CONFIGURAR-ONLINE.bat`.

## Estilos

`src/styles.css` continua como compatibilidade da base v2. A camada `src/styles/v3.css` vem depois e define a linguagem visual principal. Recursos específicos ficam separados: `simulatorPanels.css`, `arenaVisuals.css`, `effectDecision.css`, `braveUltimate.css`, `gameResult.css`, entre outros.

## Atualizações futuras

Ao adicionar uma mecânica, prefira implementar a regra em `src/game` e cobri-la em `src/game/engine.test.js`. A página `Simulator.jsx` deve apenas apresentar decisões e despachar ações. Ao alterar hospedagem, não edite os componentes: troque somente a configuração Online.
