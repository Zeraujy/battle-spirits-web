# Battle Spirits Eternal Simulator v3.9.1

## Online Lobby 2.0

- Novo diretório em tempo real para salas públicas do Online Normal.
- Presença leve de jogadores conectados ao lobby usando somente o perfil público compacto.
- Criação de sala com nome, visibilidade pública/privada e senha opcional.
- Senhas são mantidas apenas como hash SHA-256 no servidor e não são enviadas no room state.
- Salas privadas permanecem fora do diretório e continuam acessíveis por código.
- Filtros de salas abertas/todas, contadores de presença e partidas ativas.
- Estados de presença: disponível, buscando, em sala, em partida e Ranked.
- Preparação de configuração para espectadores sem liberar Spectator Mode nesta versão.
- Deck atual pode ser trocado diretamente no novo painel do lobby.
- Matchmaking rápido e Ranked continuam independentes da descoberta de salas.
- Nenhuma migração Supabase nova é necessária.
