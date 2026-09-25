# Battle Spirits Eternal Simulator — v3.5.2b

## Profile Card Banner Cleanup

Ajuste fino sobre os novos banners VS para aproximar o visual do mockup desejado e remover elementos que estavam poluindo a leitura.

### O que mudou
- A arte principal do banner agora usa de forma fixa a **carta de capa do deck selecionado**.
- A área menor do canto passa a priorizar a **foto de perfil do jogador**.
- Quando não houver avatar, o fallback por iniciais continua disponível.
- O texto de ajuda **"Clique na capa para ver detalhes"** foi removido.
- Os avisos curtos do canto superior direito, como `ERRO`, `ONLINE`, `PRÉ-TEMPORADA` e similares, não aparecem mais sobre o banner.
- O bloco lateral com **nome do deck, quantidade de cartas e textos auxiliares** foi removido para deixar a composição mais limpa.

### O que permanece
- O nome do jogador continua no topo.
- O botão **Trocar deck** continua abaixo do banner.
- O clique na capa continua podendo revelar **Rank/Status** quando existir informação relevante.
- As molduras por tier (Bronze, Silver, Gold, Platinum, Diamond, Master e Eternal) continuam ativas.

### Sem mudança de regra
Nenhuma alteração em Rules Engine, IA, Socket.IO, matchmaking, Supabase ou lógica de decks.
