# Battle Spirits Eternal Simulator v3.9.9

## Performance & Network Optimization

Esta versão é focada em desempenho, estabilidade e redução de trabalho redundante sem alterar regras de Battle Spirits ou a apresentação principal do jogo.

### Deck Builder / Database
- Cache LRU para buscas recentes do catálogo.
- Cache LRU para sugestões de cartas relacionadas.
- Validação Eternal e Oficial memoizadas por conteúdo do deck.
- Quantidades do deck indexadas em `Map` durante o render, evitando buscas lineares repetidas.
- Leitura inicial de decks persistidos executada uma única vez por montagem da tela.
- Análise de deck continua memoizada e independente de filtros/busca.

### Arena
- Relógio de turno passou de 4 atualizações visuais por segundo para 1 atualização por segundo, mantendo a exibição em segundos.
- Nenhuma regra, timing ou autoridade do relógio foi alterada; apenas a frequência de atualização visual do cliente.

### Online
- Índice `socket -> sala/jogador` evita percorrer todas as salas em ações, chat, rematch e desconexão.
- Snapshots idênticos do Lobby deixam de ser retransmitidos.
- Sanitização da partida deixou de usar `structuredClone` da árvore completa a cada envio; somente as zonas ocultas do adversário são reconstruídas para cada viewer.
- Histórico do chat não é mais anexado em todo `game:action`; ele é incluído somente em atualizações que realmente precisam carregar chat, enquanto o cliente preserva as mensagens entre estados.
- Reconexão do cliente recebeu delays progressivos menores e timeout explícito para recuperar sessões mais rapidamente em redes instáveis.

### Release
- Versão sincronizada em frontend, servidor, snapshots, Deck Builder, Updater e verificadores.
- Patch Notes internos atualizados.
- Mantido o fluxo obrigatório de integridade, limpeza e auditoria de informações técnicas expostas.
