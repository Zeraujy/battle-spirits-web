# v3.3.1a — Image Performance Hotfix

## Carregamento
- Home deixa de pré-carregar os 10 wallpapers simultaneamente.
- Primeiro wallpaper é exibido assim que decodifica; somente o próximo é preparado em idle.
- Deck Builder e biblioteca de decks usam thumbnails WebP de 300 px.
- Imagens originais continuam sendo usadas em Arena, zoom e Card Details.
- Próxima página do Deck Builder é pré-carregada discretamente quando o navegador está ocioso.

## Cache
- `_headers` adiciona cache para `cards-thumbnails`, `cards-database`, wallpapers e bundles com hash.

## Compatibilidade
- Fallback automático para a arte original se uma thumbnail estiver ausente.
- Nenhuma mudança nas regras, IA, Online ou Matchmaking.
