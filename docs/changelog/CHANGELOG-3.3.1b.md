# v3.3.1b — Card Back Loading Placeholder

## Database / Deck Builder
- O verso oficial da carta agora ocupa o card enquanto a thumbnail ainda não foi requisitada pelo lazy-loading ou está carregando.
- A frente aparece com um fade curto após o carregamento concluir.
- Se a thumbnail falhar, o simulador tenta automaticamente a arte original.
- Se thumbnail e arte original falharem, o verso permanece visível em vez de mostrar um ícone de imagem quebrada.
- Arena, zoom e modal de detalhes continuam usando as imagens originais normalmente.

## Performance
- O placeholder reaproveita `public/images/card-back.png`, então todas as cartas compartilham o mesmo asset em cache.
- O comportamento mantém o lazy-loading introduzido na v3.3.1a; cartas fora da viewport não precisam baixar a frente para exibir algo visualmente correto.
