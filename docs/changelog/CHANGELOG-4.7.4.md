# Battle Spirits: KAIHOU! Simulator — v4.7.4

## Desktop / CI hotfix

- Corrigido o build Linux `.deb` adicionando metadados de maintainer/e-mail exigidos pelo electron-builder.
- `author` e `linux.maintainer` agora usam um endereço GitHub noreply para evitar expor e-mail pessoal.
- GitHub Actions atualizadas para `checkout`, `setup-node`, `upload-artifact` e `download-artifact` v7 (runtime Node.js 24).
- Runners Linux/validação/publicação fixados em `ubuntu-24.04` para evitar mudanças inesperadas do alias `ubuntu-latest`.
- Fluxo permanece unificado: Web validada primeiro; Windows, macOS e Linux gerados em paralelo; Release publicada somente após todos os builds concluírem.
