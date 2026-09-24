# Build Status — Battle Spirits Eternal Simulator v3.3.0

## Validado neste pacote
- `npm run verify`: **OK**
- `npm run verify:v3`: **OK**
- Card database: **365 IDs únicos**
- Artwork runtime audit: **365/365 referências válidas**
- Imagens auditadas: **382**, nenhuma abaixo do limite mínimo do projeto
- LV assets: LV1 / LV2 / LV3 presentes
- Wallpaper atual da Arena presente e validado estruturalmente
- `npm test`: **108/108 testes passando**
  - 102 testes anteriores preservados
  - 6 novos testes de Planning / Lookahead
  - lethal previsto através de Main → Attack
  - legalidade de toda a sequência planejada
  - horizonte maior no Hard do que no Normal
  - parada/replanejamento ao revelar informação do deck
  - determinismo do plano em estado seeded
  - garantia de que o score de Draw não espia a identidade da próxima carta
- Simulação real **SD23 vs SD28 (Hard vs Hard)**: **86 ações**, **5 turnos**, término normal por Life e **0 ações ilegais**.

## Planning / Lookahead
- `rankAIPlans()` adiciona busca multi-ação limitada sobre ações reais da Rules Engine.
- Normal analisa uma continuação; Hard pode analisar até três decisões futuras além da ação atual.
- O feixe mantém ações de progresso relevantes, permitindo enxergar Main → Attack e sequências de pressão.
- A busca encerra quando o controle passa ao oponente ou quando uma resolução revela informação antes oculta do deck.
- A CPU executa apenas a primeira ação do plano e recalcula tudo após cada mudança real do estado.
- O ranking agora pode expor `planScore`, `planBonus`, `planDepth`, `planNodes` e `planActions` para o futuro AI Debugger.

## Build Vite neste ambiente
O pacote GitHub-ready não inclui `node_modules`. O build de produção deve ser gerado após `npm install` no computador de destino ou pelo pipeline do Cloudflare.

```powershell
npm install
npm run check
```
