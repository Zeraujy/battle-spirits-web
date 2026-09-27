# Battle Spirits: KAIHOU! Simulator — v4.7.2

## Cliente Desktop único

- O pacote Windows deixa de criar `Server.exe` e `Updater.exe` separados.
- O jogador inicia o jogo somente pelo executável principal **Battle Spirits: KAIHOU! Simulator**.
- O backend/multiplayer continua remoto; código de servidor não entra no pacote Desktop.

## Atualizações automáticas

- O cliente continua verificando a GitHub Release oficial ao iniciar.
- Quando uma versão mais nova é encontrada, o updater interno inicia automaticamente o download e a instalação.
- Windows utiliza NSIS em modo silencioso; macOS e Linux mantêm os fluxos internos de substituição já existentes.
- SHA-256 continua sendo validado quando `SHA256SUMS.txt` estiver disponível na release.
