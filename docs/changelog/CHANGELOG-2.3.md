# Battle Spirits Eternal Simulator 2.3.0

## Arena
- Steps centralizados no topo da janela.
- Cartas do campo maiores.
- Life voltou a ser representado por Cores azuis no centro do HUD.
- Cada jogador online escolhe uma cor antes da partida; o HUD/turno usa essa cor.
- Trash mostra as cartas enquanto o mouse permanece sobre ele.
- Carta selecionada não gira mais quando a carta do campo está Exhausted.
- Cartas não utilizáveis na mão ficam visualmente escurecidas conforme timing/custo disponível.

## Resolução manual
- Novo `Void → Core`, adicionando um Core regular à Reserve.
- Novo sistema de cartas reveladas:
  - `Revelar` revela uma carta do topo por clique.
  - cartas reveladas aparecem grandes para os dois jogadores;
  - podem ser arrastadas para a Mão;
  - podem ser arrastadas para `Topo` ou `Fundo` do Deck.

## Conta / perfil
- Nova página Conta.
- Perfil social com avatar, banner, @username, nome de exibição e bio.
- Amigos e mensagens diretas quando Supabase estiver configurado.
- Sincronização opcional de perfil e decks com Supabase.
- `supabase/SOCIAL-SETUP-2.3.sql` cria as tabelas e políticas necessárias.

## Personalização
- Editor de tema completo nas Configurações para fundo, painéis, textos, destaques e cores de status.

## Online / segurança
- Cor do jogador é transmitida pela sala e salva no estado da partida.
- Ordem do Deck adversário passa a ser ocultada no estado enviado pelo servidor; cartas reveladas e Trash continuam públicos.

## Testes
- 18 testes automatizados da engine aprovados.
