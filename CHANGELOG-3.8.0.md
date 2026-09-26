# Battle Spirits Eternal Simulator v3.8.0

## Post-Match Screen

- Tela de resultado expandida com apresentação cinematográfica de **VICTORY / DEFEAT**.
- Resumo pós-partida mostra duração, turnos, deck identificado, Life restante e motivo do encerramento.
- Card Mastery aparece imediatamente no resultado com XP total distribuído e destaque para a carta de capa do deck.
- Partidas Ranked exibem a variação real de RP recebida do servidor, RP anterior/novo e Rank atualizado.
- Online Normal ganha pedido de revanche consensual: a nova partida só começa quando os dois jogadores aceitarem.
- Ranked não permite revanche direta; o botão retorna à fila competitiva para preservar a integridade do matchmaking.
- Após partidas Online/Ranked é possível adicionar o adversário ou abrir seu perfil a partir do próprio resultado, quando ele possui @usuário público.
- O perfil pode ser aberto diretamente pelo @usuário vindo da tela pós-partida sem aumentar o payload do Socket.IO.
- Correção de integração: o modo `ranked` passa a usar explicitamente o mesmo transporte Online do Simulator (`mode === online || ranked`).
- Nenhuma migração nova do Supabase é necessária nesta versão.
