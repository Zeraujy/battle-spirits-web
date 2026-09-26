# Build Status — Battle Spirits Eternal Simulator v4.0.0

Data da validação: 26/09/2026

## Aprovado
- 138/138 testes automatizados.
- Verificação estrutural do projeto.
- Auditoria de artes das cartas.
- Auditoria de referências de imagens em runtime.
- Auditoria de UI/responsividade.
- Auditoria de release e informações técnicas expostas ao jogador.
- 130 arquivos JS/JSX/MJS/CJS analisados sintaticamente.
- 326 imports relativos verificados sem referências quebradas.

## Build Vite neste ambiente
O bundle Vite não pôde ser produzido neste ambiente Linux porque o conjunto de dependências disponível para validação contém o binding nativo do Rolldown de outra plataforma e não inclui `@rolldown/binding-linux-x64-gnu`.

Nenhum `node_modules` ou build parcial é incluído no pacote final. Em uma instalação normal do projeto, execute `npm install` no sistema de destino antes de `npm run build`.
