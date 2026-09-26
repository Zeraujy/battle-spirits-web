# Release Audit — Battle Spirits Eternal Simulator v3.9.9

## Escopo
Performance & Network Optimization sobre a base v3.9.8.

## Alterações de desempenho
- Cache LRU de buscas do catálogo (80 entradas recentes).
- Cache LRU de cartas relacionadas (160 combinações carta/limite).
- Validação Eternal/Oficial do Deck Builder memoizada pelo conteúdo do deck.
- Quantidade por card indexada por `Map` para o render do catálogo.
- Leitura inicial dos decks persistidos limitada à montagem inicial do Deck Builder.
- Relógio visual de turno reduzido de 250 ms para 1000 ms por atualização.
- Índice de sockets por sala/jogador no servidor Online.
- Supressão de snapshots de Lobby semanticamente idênticos.
- Sanitização de informação oculta sem clonagem profunda do match inteiro.
- Chat removido dos broadcasts comuns de `game:action`; clientes preservam o histórico entre estados.
- Reconexão com backoff entre 500 ms e 4 s e timeout de 10 s.

## Integridade
- 138/138 testes aprovados.
- Verificador v3: 61 arquivos essenciais.
- Verificação estrutural do catálogo aprovada.
- 365 cartas únicas em runtime.
- 382 artes WebP auditadas.
- 0 referências de arte ausentes.
- 90 arquivos JS/MJS/CJS aprovados por `node --check`.
- 371 imports relativos verificados; 0 ausentes.
- Marcadores de versão sincronizados.

## Auditorias de release
- `UI AUDIT OK`.
- `RELEASE AUDIT OK — v3.9.9`.
- Busca manual por termos técnicos em componentes player-facing sem novas exposições de backend.

## Limpeza
O pacote final não deve conter `.git`, `node_modules`, `dist`, `release`, `.env`, logs, caches ou backups temporários. Arquivos `.env.example` permanecem como modelos sem credenciais.

## Build
Foi tentado `npm ci --ignore-scripts`, porém a instalação excedeu o tempo disponível do ambiente. O `node_modules` parcial foi removido antes do empacotamento. O build final deve ser gerado no ambiente de desenvolvimento Windows com `npm install` / `npm run build`.
