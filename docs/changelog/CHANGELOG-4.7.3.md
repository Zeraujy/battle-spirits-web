# Battle Spirits: KAIHOU! Simulator — v4.7.3

## CI/CD Desktop
- Corrige a validação `afterPack` no macOS para localizar `app.asar` dentro de `<App>.app/Contents/Resources`.
- Configura um nome de executável Linux seguro (`battle-spirits-kaihou-simulator`) para evitar caracteres inválidos do `productName`.
- Define `desktopName` + `linux.syncDesktopName` para associação correta de janela/launcher no Linux.
- Mantém os artefatos públicos com branding amigável (`Battle-Spirits-Linux-*.AppImage/.deb` e `Battle-Spirits-macOS-*.dmg/.zip`).

## Main Menu
- Restaura o título clássico da tela inicial: logo Battle Spirits + `GATE OPEN` + `KAIHOU!`.
- Remove `SIMULATOR` apenas da composição visual do menu principal; o nome oficial do aplicativo continua `Battle Spirits: KAIHOU! Simulator`.
