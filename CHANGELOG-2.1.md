# Battle Spirits Eternal Simulator 2.1 — Interface & Manual Core Update

## Arena

- Layout reorganizado para aproveitar melhor a altura da tela.
- Reserve física no painel esquerdo.
- Core Trash física no painel direito.
- Cores e Soul Core individuais, arrastáveis e reposicionáveis.
- Movimento manual de Cores durante o Main Step.
- Level/BP continua sendo recalculado automaticamente.
- Invocação/Deploy por drag-and-drop da mão para o campo.
- Pagamento manual de Spirit, Ultimate, Brave, Nexus, Magic e Mirage.
- Jogada/pagamento pendente bloqueia avanço inválido de fase.
- Direct Combine integrado ao pagamento manual.
- Ataque por arrasto até a Life do oponente com seta visual.
- Zoom automático de cartas viradas para cima após hover curto.
- Steps aumentados.
- Texto de efeito com destaques para keywords, Levels e BP.
- Painel manual antigo mantido de forma compacta como fallback.

## Online

- Chat de sala sincronizado pelo servidor.
- Histórico limitado às 100 mensagens recentes, até 500 caracteres por mensagem.
- Servidor mantém proteção para erros de eventos Socket.IO sem encerrar o processo.
- Correção anterior de criação de sala com `player2: null` incorporada.

## Menu

- "Eternal Simulator" substituído por **Gate Open, Kaihou!**.
- Removidos textos técnicos/desnecessários dos cards do menu.
- Nova tela **DECKS**.
- Decks podem escolher uma carta da própria lista como capa.
- Nova tela **Configurações**.
- Idiomas: Português (Brasil) e English.
- Resoluções predefinidas com 1920×1080 como padrão desejado.
- Modo Janela e Tela cheia.
- No Electron, o tamanho em janela respeita a área útil do monitor para evitar abrir fora da tela.

## Engine / testes

- Fluxo manual adicionado sem remover as ações automáticas legadas da engine.
- Pagamento manual durante Flash Timing.
- Movimento ao Core Trash e undo controlado durante pagamento pendente.
- 16 testes automatizados de engine passando nesta versão.
