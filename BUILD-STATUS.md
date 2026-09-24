# Build Status — Battle Spirits Eternal Simulator v3.2.1

## Validado neste pacote
- `npm run verify`: **OK**
- `npm run verify:v3`: **OK**
- Card database: **365 IDs únicos**
- Artwork runtime audit: **365/365 referências válidas**
- LV assets: LV1 / LV2 / LV3 presentes
- Wallpaper atual da Arena presente e validado estruturalmente
- CSS consolidado da Arena parseado com PostCSS sem erros
- `npm test`: **76/76 testes passando**
  - 71 testes anteriores preservados
  - seed determinística
  - Legal Actions
  - Action Log estruturado
  - auditoria de integridade
  - snapshot/restauração/replay

## Build Vite neste ambiente
O build de produção não pôde ser concluído porque o `node_modules` recebido no ZIP foi instalado/materializado para Windows.

O launcher local de Vite tenta executar `node.exe`; ao invocar o Vite diretamente com o Node Linux, o Rolldown não encontra o binding nativo de Linux.

Isso não é um erro detectado no código-fonte da v3.2.1. Para gerar o build no Windows, reinstale as dependências no próprio computador antes de compilar:

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
