# Build Status — Battle Spirits Eternal Simulator v3.2.3

## Validado neste pacote
- `npm run verify`: **OK**
- `npm run verify:v3`: **OK**
- Card database: **365 IDs únicos**
- Artwork runtime audit: **365/365 referências válidas**
- LV assets: LV1 / LV2 / LV3 presentes
- Wallpaper atual da Arena presente e validado estruturalmente
- `npm test`: **90/90 testes passando**
  - 86 testes anteriores preservados
  - 4 novos testes de CPU Core & Resource Management
  - invocação legal diretamente em Level superior
  - Level Up por `MOVE_CORE` quando o investimento é vantajoso
  - preservação de Reserve para jogadas seguintes
  - valorização de símbolos que reduzem cartas da própria mão
- Simulação real **SD23 vs SD28**: 110 ações, 6 turnos, término normal por Life e nenhuma ação ilegal.
  - 9 decisões de `MOVE_CORE`
  - 3 invocações com Cores adicionais para Level superior

## Build Vite neste ambiente
O pacote GitHub-ready não inclui `node_modules`. O build de produção deve ser gerado após `npm install` no computador de destino ou pelo pipeline do Cloudflare.

As verificações estruturais e a suíte completa da Rules Engine/CPU passaram normalmente.

```powershell
npm install
npm run check
```
