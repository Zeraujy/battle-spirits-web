# Build Status — Battle Spirits Eternal Simulator v3.2.5

## Validado neste pacote
- `npm run verify`: **OK**
- `npm run verify:v3`: **OK**
- Card database: **365 IDs únicos**
- Artwork runtime audit: **365/365 referências válidas**
- Imagens auditadas: **382**, nenhuma abaixo do limite mínimo do projeto
- LV assets: LV1 / LV2 / LV3 presentes
- Wallpaper atual da Arena presente e validado estruturalmente
- `npm test`: **102/102 testes passando**
  - 96 testes anteriores preservados
  - 6 novos testes de Card Effect Intelligence
  - prioridade semântica de alvo para Exhaust
  - prioridade semântica de alvo para Refresh
  - prioridade de retorno à mão sobre ameaças mais valiosas
  - BP contextual no atacante/bloqueador atual
  - identificação de Draw e geração de Core
  - privacidade da mão oculta do adversário preservada
- Simulação real **SD23 vs SD28 (Hard vs Hard)**: 240 ações, 18 turnos, término normal por Life e **0 ações ilegais**.

## Card Effect Intelligence
- `src/game/aiEffectSemantics.js` adiciona score semântico de transições reais.
- `rankAIActions()` passa a registrar `effectScore` e `effectReasons`.
- Decision Queue usa valor do alvo em vez de tratar todos os alvos legais como equivalentes.
- Magic/Burst/Trigger continuam executados exclusivamente pela Rules Engine.

## Build Vite neste ambiente
O pacote GitHub-ready não inclui `node_modules`. O build de produção deve ser gerado após `npm install` no computador de destino ou pelo pipeline do Cloudflare.

```powershell
npm install
npm run check
```
