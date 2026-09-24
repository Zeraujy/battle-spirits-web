# Battle Spirits 2.3.5

Hotfix do executável Windows para conexão online por Socket.IO polling.

- O Electron empacotado não carrega mais a interface por `file://`.
- A interface do app é servida internamente em `127.0.0.1` numa porta aleatória.
- Isso fornece uma origem HTTP normal ao renderer, equivalente ao ambiente que já funcionava no navegador/Vite.
- O servidor local da interface só escuta em loopback e não fica exposto à rede.
- Não altera o servidor de partidas, Funnel, regras, cartas, decks ou dados pessoais.
- Mantém o hotfix 2.3.4 com Socket.IO usando somente polling.
