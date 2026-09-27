# Battle Spirits: KAIHOU! Simulator v4.7.1

## Desktop Release Publishing Hotfix

- Windows, macOS e Linux continuam sendo compilados em runners nativos separados.
- Os comandos `desktop:win`, `desktop:mac` e `desktop:linux` agora executam o `electron-builder` com `--publish never`.
- Isso impede a publicação implícita detectada em CI, que exigia `GH_TOKEN` durante cada build individual.
- Os artefatos são enviados pelo `actions/upload-artifact` e publicados somente pelo job final `publish-desktop`, que já usa o token oficial do GitHub Actions.
- Nenhuma alteração foi feita na lógica de gameplay, economia, autenticação ou interface do simulador.
