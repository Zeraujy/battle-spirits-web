# Battle Spirits Eternal Simulator v3.1.6

## Arena Card Presentation

- Adicionados assets oficiais do projeto para `LV1`, `LV2` e `LV3` na Arena.
- Cartas em campo agora exibem **LV** e **BP** fora da arte, facilitando leitura rápida.
- O indicador permanece legível mesmo quando a carta está **Exhausted**.
- Nexuses exibem o nível sem tentar mostrar BP.
- Braves combinados agora aparecem visualmente atrás do Spirit/Ultimate hospedeiro.
- O BP exibido no host combinado usa o valor efetivo calculado pela Rules Engine, incluindo o bônus do Brave.
- Cartas de raridade alta mantêm o glow externo, agora com cores reais da carta (vermelho, roxo, verde, branco, amarelo, azul ou prismático).
- Braves de raridade alta também podem receber glow próprio quando estão combinados.

## Visual Polish herdado da v3.1.5

- Botões de **Voltar** refinados e padronizados.
- Destaques de texto e informações de carta usam acentos sutis baseados na cor principal da carta, sem abandonar o visual preto e branco.
- Botão **Contra IA** continua visível e inativo na Home, preparando espaço para o futuro modo Fácil / Médio / Difícil.

## Organização

- Componentes visuais novos foram separados em:
  - `src/components/game/ArenaCardStatus.jsx`
  - `src/components/game/ArenaBraveAttachment.jsx`
- Estilos da apresentação de cartas foram isolados em:
  - `src/styles/arena/cardPresentationV316.css`
- Assets de nível usados em runtime ficam em:
  - `public/images/ui/arena/levels/`
- Originais enviados pelo usuário ficam preservados em:
  - `resources/source-assets/arena-levels/`

## Regras

Esta atualização altera somente apresentação e interface. A Rules Engine continua sendo a fonte de verdade para Level, BP, Brave, custos e demais regras.
