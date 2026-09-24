# Build Status — Battle Spirits Eternal Simulator v3.2.2

## Validado neste pacote
- `npm run verify`: **OK**
- `npm run verify:v3`: **OK**
- Card database: **365 IDs únicos**
- Artwork runtime audit: **365/365 referências válidas**
- LV assets: LV1 / LV2 / LV3 presentes
- Wallpaper atual da Arena presente e validado estruturalmente
- `npm test`: **86/86 testes passando**
  - 82 testes anteriores preservados
  - 4 novos testes de CPU Combat Intelligence
  - preservação do último bloqueador em situação de risco
  - rejeição de ataque suicida não letal
  - escolha eficiente de bloqueador
  - prioridade de ataque letal
- Simulação real **SD23 vs SD28**: 118 ações, 7 turnos, término normal por Life e nenhuma ação ilegal.

## Build Vite neste ambiente
O pacote GitHub-ready não inclui `node_modules`. A tentativa de reutilizar as dependências do ZIP Windows não é válida no ambiente Linux por causa do binding nativo do Vite/Rolldown, então o build de produção deve ser gerado após `npm install` no computador de destino ou no Cloudflare.

As verificações estruturais e a suíte completa da Rules Engine/CPU passaram normalmente.

```powershell
npm install
npm run check
```
