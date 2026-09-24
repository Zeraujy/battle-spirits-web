# Build Status — Battle Spirits Eternal Simulator v3.3.1

## Validado neste pacote
- `npm run verify`: **OK**
- `npm run verify:v3`: **OK**
- `npm test`: **112/112 testes passando**
- Card database: **365 IDs únicos**
- Artwork runtime audit: **365/365 referências válidas**
- Imagens auditadas: **382**, nenhuma abaixo do limite mínimo do projeto
- Sintaxe JSX validada para `AiSetup.jsx`, `Simulator.jsx` e `ProjectInfoButtons.jsx`

## Archetype Intelligence
- Novo `src/game/aiArchetypes.js`.
- Perfis: Agressivo, Controle, Defensivo, Ultimate, Brave, Recursos e Equilibrado.
- Perfis híbridos são suportados por afinidades combináveis.
- SD23 Eris: **Ultimate / Controle**.
- SD28 Land of Deep Green: **Ultimate / Brave**.
- O perfil é calculado pela decklist conhecida antes da partida e armazenado em `match.ai.archetypeProfile`.
- Sem perfil pré-calculado, a IA usa Equilibrado para não derivar estratégia da ordem escondida do deck.

## AI Debugger
- Novo `chooseAIDecision()` preservando `chooseAIAction()` como wrapper compatível.
- Debugger opcional na tela Contra IA.
- Painel na Arena com score total, imediato, Lookahead, arquétipo, efeito, linha prevista e alternativas.
- O painel usa o mesmo ranking que escolhe a ação real da CPU.

## Regras e segurança
- Toda jogada da CPU continua vindo de `getLegalActions()` e passando por `applyGameAction()`.
- A identidade da mão oculta do oponente continua fora da avaliação.
- As fronteiras de informação oculta do Lookahead continuam ativas.

## Simulação real
**SD23 Eris vs SD28 Land of Deep Green — Hard vs Hard**
- 93 ações
- 5 turnos
- 0 ações ilegais
- término normal por Life

## Build Vite neste ambiente
O pacote GitHub-ready não inclui `node_modules`. O build de produção deve ser gerado após `npm install` no computador de destino ou pelo pipeline do Cloudflare.

```powershell
npm install
npm run check
```
