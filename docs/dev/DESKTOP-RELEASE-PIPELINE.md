# Web + Desktop release pipeline (v4.4.0)

## Fluxo diário

1. Aplicar o ZIP pelo `GERENCIAR_PROJETO.bat`.
2. O gerenciador executa validação, testes, build Web e preflight do limite de assets do Cloudflare.
3. O gerenciador faz commit/push para o GitHub.
4. O Cloudflare continua recebendo o mesmo commit pelo deploy conectado ao repositório.
5. O GitHub Actions valida o mesmo commit e gera automaticamente os pacotes Desktop.
6. Os pacotes são publicados em uma GitHub Release com a mesma versão do `package.json`.
7. Clientes Desktop instalados consultam a release oficial e avisam quando existe versão mais nova.

## Plataformas

- Windows x64: NSIS (`Battle-Spirits-Windows-Setup.exe`)
- macOS Apple Silicon: DMG/ZIP (`Battle-Spirits-macOS-arm64.*`)
- macOS Intel: DMG/ZIP (`Battle-Spirits-macOS-x64.*`)
- Linux x64: AppImage e DEB (`Battle-Spirits-Linux-x64.*`)

## Observação de assinatura

Os builds funcionam sem certificados, mas Windows SmartScreen e macOS Gatekeeper podem exibir avisos. Para uma experiência pública sem alertas e atualização macOS totalmente transparente, configure assinatura de código e notarização em uma etapa futura.
