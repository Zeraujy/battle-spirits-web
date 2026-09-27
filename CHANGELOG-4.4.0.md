# Battle Spirits Eternal Simulator — v4.4.0

## Web + Desktop Unified Release

- A versão web continua sendo a experiência principal e agora exibe **Download Desktop** apenas no navegador.
- Download desktop preparado para Windows, macOS (Apple Silicon/Intel) e Linux (AppImage/.deb).
- O mesmo push no GitHub valida a web e gera automaticamente os instaladores desktop por GitHub Actions.
- As releases desktop usam a mesma versão do `package.json`, evitando divergência entre Web e Desktop.
- O cliente desktop consulta automaticamente a release mais recente e pode baixar a atualização adequada ao sistema.
- Adicionada auditoria de assets do Cloudflare para bloquear arquivos individuais acima de 25 MiB antes da etapa de release.
- Preservado o posicionamento aprovado do perfil local na tela Ranked.
