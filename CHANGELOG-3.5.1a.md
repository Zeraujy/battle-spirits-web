# v3.5.1a — Deck Library Visibility Fix

Hotfix visual sobre a v3.5.1.

## Corrigido
- Decks salvos voltam a aparecer normalmente na biblioteca.
- O `PointerTiltSurface` das capas passa a ter altura explícita, evitando o colapso provocado por `height: 100%` carregado depois pelo CSS da v3.5.0.
- O card interno agora preenche o wrapper 3D com `height: 100% !important`, tornando o resultado independente da ordem de carregamento dos chunks CSS.
- Em telas com menos de 960px de altura, Meus Decks usa 4 decks por página para manter uma única linha totalmente visível e sem scroll do documento.
- Em telas maiores, a biblioteca continua exibindo até 8 decks por página.

## Preservado
- Todos os decks e cartas salvos.
- Efeito 3D/Perspectiva das capas.
- Novo Deck, Deck Builder e seus modais.
- Rules Engine, Eternal CPU, Online, Supabase e demais sistemas de gameplay.
