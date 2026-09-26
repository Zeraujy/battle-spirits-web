# Battle Spirits Eternal Simulator v3.9.2 — Custom Match Settings

## Custom Rooms
- Salas Online Normal agora podem escolher quem começa: aleatório, host ou convidado.
- Novo relógio server-side por turno: sem limite, 60, 90, 120 ou 180 segundos.
- Se o tempo expirar, a partida termina por `turn_timeout`; o navegador apenas exibe o relógio enviado pelo servidor.
- Mulligan pode ser habilitado ou desabilitado por sala.

## LAB Rules
- Novo preset `LAB · teste de decks` para testes privados/casuais.
- LAB aceita decks a partir de 1 carta e até 99 cópias pelo mesmo nome.
- Cartas ainda precisam existir no database; nenhuma regra de efeito/combate é relaxada.

## Segurança e arquitetura
- Configurações são normalizadas e validadas pelo servidor.
- Ranked ignora Custom Match Settings e mantém regras competitivas próprias.
- Quick Match continua com regras padrão e primeiro jogador aleatório.
- O relógio é controlado pelo servidor e reiniciado apenas quando o turno realmente muda.
