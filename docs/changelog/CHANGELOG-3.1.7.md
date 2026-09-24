# Battle Spirits Eternal Simulator v3.1.7 — Arena Visual Polish

A v3.1.7 é uma atualização de polimento visual da Arena clássica. Ela não altera a Rules Engine e não muda as regras do jogo.

## Cartas em campo

- Tamanho e espaçamento refinados para evitar cortes e melhorar leitura em diferentes larguras de desktop.
- Cartas, glow, Brave e HUD externo podem ultrapassar visualmente a moldura da zona sem serem recortados.
- LV e BP continuam fora da arte e permanecem retos quando a carta está Exhausted.
- Seleção usa sombra discreta, sem moldura branca ao redor do slot.
- Carta Exhausted recebe apenas uma redução sutil de brilho/saturação; a arte continua nítida.

## Brave

- Carta Brave combinada fica mais visível atrás do host.
- Offset e escala foram refinados para mostrar melhor as duas cartas sem ocupar espaço excessivo.
- Tag `BRAVE` ficou menor e menos intrusiva.
- O quadro branco ao redor do host continua removido.

## Raridade e cor

- Glow de raridades altas continua seguindo a cor principal da carta.
- O glow permanece externo à arte para não prejudicar a leitura da carta.

## Combate

- Atacante e bloqueador recebem destaque de cor baseado na própria carta.
- Durante o Block Step, cartas que a Rules Engine considera bloqueadores legais recebem um sinal visual discreto.
- Pequenas tags `ATACANTE` / `BLOQUEADOR` ajudam a identificar o estado da batalha sem criar molduras grandes.
- Respeita `prefers-reduced-motion` para usuários que desativam animações.

## Organização

Novos arquivos específicos desta revisão:

- `src/components/game/ArenaBattleRole.jsx`
- `src/styles/arena/cardPresentationV317.css`
- `src/styles/arena/battleEmphasisV317.css`

A lógica de regras continua em `src/game/`; estes arquivos são somente de apresentação.
