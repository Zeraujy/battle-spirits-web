# Build Status — Battle Spirits Eternal Simulator v3.2.1

## Validado neste pacote
- `npm run verify`: **OK**
- `npm run verify:v3`: **OK**
- Card database: **365 IDs únicos**
- Artwork runtime audit: **365/365 referências válidas**
- LV assets: LV1 / LV2 / LV3 presentes
- Wallpaper atual da Arena presente e validado estruturalmente
- CSS consolidado da Arena parseado com PostCSS sem erros
- `npm test`: **82/82 testes passando**
  - 71 testes anteriores preservados
  - seed determinística
  - Legal Actions
  - Action Log estruturado
  - auditoria de integridade
  - snapshot/restauração/replay
  - CPU Beta 2: legalidade, ataque/bloqueio letal, informação oculta, decisão determinística e simulação IA vs IA

## Build Vite neste ambiente
Este pacote GitHub-ready não inclui `node_modules`, então o build Vite não foi executado neste ambiente. Os arquivos JSX modificados foram validados sintaticamente e as verificações estruturais/testes da Rules Engine passaram.

Para gerar o build no Windows, instale as dependências no próprio computador antes de compilar:

```powershell
npm install
npm run check
npm run dev:web
```

Se quiser apenas validar sem abrir o aplicativo:

```powershell
npm run verify
npm test
npm run build
```
