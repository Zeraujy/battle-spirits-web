# Build Status — Battle Spirits Eternal Simulator v3.2.4

## Validado neste pacote
- `npm run verify`: **OK**
- `npm run verify:v3`: **OK**
- Card database: **365 IDs únicos**
- Artwork runtime audit: **365/365 referências válidas**
- Imagens auditadas: **382**, nenhuma abaixo do limite mínimo do projeto
- LV assets: LV1 / LV2 / LV3 presentes
- Wallpaper atual da Arena presente e validado estruturalmente
- `npm test`: **96/96 testes passando**
  - 90 testes anteriores preservados
  - 6 novos testes de Flash, Magic & Burst Intelligence
  - timing Main/Flash estruturado
  - resposta de Flash contra lethal
  - preservação de Magic sem alvo útil
  - prioridade de Set Burst automático
  - ativação de Burst com alvo valioso
  - PASS_BURST quando a ativação não produz valor
- Simulação real **SD23 vs SD28 (Hard vs Hard)**: 317 ações, 22 turnos, término normal por Life e **0 ações ilegais**.
  - 2 `SET_BURST`
  - 4 `PASS_BURST`
  - 1 `USE_MAGIC` em Flash
  - 58 `PASS_FLASH`
  - 20 ataques e 9 bloqueios
  - 12 resoluções de Ultimate Trigger

## Build Vite neste ambiente
O pacote GitHub-ready não inclui `node_modules`. O build de produção deve ser gerado após `npm install` no computador de destino ou pelo pipeline do Cloudflare.

As verificações estruturais, de artwork e a suíte completa da Rules Engine/CPU passaram normalmente.

```powershell
npm install
npm run check
```
