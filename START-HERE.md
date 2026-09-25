# START HERE — v3.5.2d

Arquivos principais desta revisão:

- `src/components/match/MatchSetupScreen.jsx` — componente compartilhado dos banners VS.
- `src/styles/pages/matchSetupV341.css` — alinhamento e dimensões compartilhadas dos banners/VS.
- `src/components/common/ProjectInfoButtons.jsx` — Patch Notes internos.
- `src/config/appVersion.js` — versão atual do simulador.

## v3.5.2d — VS & Banner Alignment Fix

- Os dois jogadores reservam a mesma altura de cabeçalho, banner e área inferior.
- O oponente/CPU reserva o espaço do botão mesmo quando não possui ação `Trocar deck`.
- O `VS` é alinhado pela linha do banner, evitando o deslocamento visto na v3.5.2c.

Antes de publicar:

```powershell
npm run check
```
