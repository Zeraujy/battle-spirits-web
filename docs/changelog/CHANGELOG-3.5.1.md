# Battle Spirits Eternal Simulator v3.5.1

## Game Flow & Modal UX

- Padroniza Voltar, Aplicar, Novo Deck, Salvar e ações de conta com a linguagem visual do Menu Principal.
- Remove setas decorativas dos botões Voltar.
- Configurações passa a funcionar como uma janela central, com scroll apenas no conteúdo interno quando necessário.
- Meus Decks e Deck Builder ficam presos ao viewport no desktop; a biblioteca usa paginação e áreas internas.
- Novo Deck e detalhes de carta usam React portals para permanecer no centro real da tela.
- Deck Builder passa a exibir 14 cartas por página.
- O modal de carta mantém o efeito 3D/Perspectiva completo.
- Biblioteca de decks mostra até 8 decks por página.

Nenhuma regra de gameplay, IA, Socket.IO, matchmaking, Supabase ou database foi alterada.
