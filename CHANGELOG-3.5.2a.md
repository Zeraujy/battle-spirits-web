# Battle Spirits Eternal Simulator — v3.5.2a

## Ranked Banner Visual Polish

Segunda passada visual sobre os novos banners dos modos de jogo.

### Molduras por tier
- Ranked Bronze recebe uma moldura Bronze dedicada.
- Sistema preparado para Silver, Gold, Platinum, Diamond e Master.
- Modos sem Rank usam a moldura Eternal monocromática.
- Avatar, crest e bordas compartilham a mesma identidade do tier.

### Reveal ao clicar
- Clique na arte continua revelando Rank/Status/detalhes.
- Novo crest central durante o reveal.
- Glow acompanha a cor do tier.
- Arte da capa escurece e aproxima levemente durante a transição.
- Animação curta e compatível com `prefers-reduced-motion`.

### Visual preservado
- Nome do jogador permanece no topo.
- Capa do deck permanece como arte principal.
- Avatar permanece integrado ao banner.
- Botão `Trocar deck` permanece logo abaixo.
- Jogo Livre, Eternal CPU, Online Normal e Ranked continuam usando o mesmo componente compartilhado.

### Sem mudança de regra
Nenhuma alteração em Rules Engine, IA, Socket.IO, matchmaking, Supabase ou lógica de decks.
