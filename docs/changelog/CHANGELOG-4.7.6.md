# Battle Spirits: KAIHOU! Simulator v4.7.6

- Corrige o ciclo de vida da janela principal do Electron: a BrowserWindow agora mantém uma referência forte durante toda a execução.
- Evita o comportamento em que o cliente instalado iniciava e encerrava imediatamente sem exibir a interface.
- Adiciona tratamento explícito de falha ao carregar a interface no Desktop.
- Mantém o pipeline multiplataforma, ASAR e hardening de produção.
- macOS: distribuição sem assinatura/notarização continua sujeita ao Gatekeeper; builds oficiais assinadas exigem credenciais Apple Developer.
