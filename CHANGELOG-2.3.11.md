# Battle Spirits 2.3.11 — Online Compatibility

- Mantém gameplay, engine, arena, conta, decks, temas e interface da linha 2.3.x.
- Navegador continua usando Socket.IO diretamente, como antes.
- No executável Windows, Socket.IO agora roda no processo principal do Electron e comunica com a interface via IPC.
- Mantém os eventos modernos: salas, resume/reconexão, chat e game:action.
- Não altera regras nem mecânicas da partida.
- Objetivo: eliminar a diferença de conexão entre navegador e .exe.
