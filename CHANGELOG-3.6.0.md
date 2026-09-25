# Battle Spirits Eternal Simulator — v3.6.0

## Social Hub & Player Identity

Grande atualização da experiência social do simulador. O sistema foi redesenhado como uma área própria, inspirada em launchers de jogos, sem acoplar dados sociais ao Socket.IO das partidas.

### Social Hub
- Nova tela em viewport fixo, sem scroll da página principal.
- Navegação lateral para Visão Geral, Perfil, Amigos, Mensagens, Notificações, Maestria e Privacidade.
- Lista de amigos persistente à direita em telas desktop, com presença, mensagens não lidas e atalho para conversa.
- Painéis internos fazem scroll apenas quando necessário.

### Perfil & mídia
- Editor de nome, @username, bio, avatar e banner.
- Avatar e banner são compactados no navegador antes de serem salvos.
- Preview público de outros jogadores respeita a política de visibilidade.

### Privacidade
- Perfil: Público / Somente Amigos / Privado.
- Pedidos: Todos / Amigos em comum / Ninguém.
- Mensagens: Somente Amigos / Todos / Ninguém.
- Controles independentes para descoberta, presença Online, estatísticas, decks e Maestria.
- Lista de jogadores bloqueados com opção de desbloqueio.
- RLS/RPCs do Supabase reforçadas para evitar auto-aceite de amizade e limitar leitura/gravação social.

### Amigos
- Pedidos agora usam status `pending` de verdade.
- O destinatário pode Aceitar ou Recusar.
- Pedidos enviados ficam visíveis como pendentes.
- Remover amigo e Bloquear jogador usam RPCs dedicadas.

### Mensagens & notificações
- Conversas privadas com lista de conversas, mensagens não lidas e marcação de leitura.
- Notificações de pedido de amizade, amizade aceita e nova mensagem.
- Realtime é usado somente enquanto o Social Hub está aberto, com polling leve como fallback.
- O Social Hub é desmontado ao sair da tela, então não mantém canal social durante partidas.

### Estatísticas & Maestria
- Visão geral mostra amigos, decks válidos, cartas únicas e afinidade de cor.
- Maestria de cartas em sete níveis, baseada inicialmente em presença, quantidade e uso como capa nos decks salvos.
- Cartas de Maestria usam o efeito 3D/Perspectiva da identidade Eternal.
- Nenhuma informação oculta de partidas Online é usada para calcular Maestria.

### Segurança do Online preservada
- `src/online/publicProfile.js` continua sendo a única fonte do perfil enviado ao servidor de partidas.
- Bio, banner, privacidade, amigos, notificações e DMs não entram no payload Socket.IO.
- O limite e a compactação de avatar da v3.3.1e permanecem intactos.

### Migração Supabase
Execute uma vez:

`supabase/SOCIAL-HUB-3.6.sql`

A interface detecta automaticamente quando a migração ainda não foi aplicada e mantém o perfil local funcionando.
