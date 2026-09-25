# v3.4.0 — Main Menu & Game Modes Redesign

Data: 24/09/2026

## Novo menu principal
- Home reconstruída com base no mockup feito no Photoshop.
- Wallpapers já existentes em `public/images/wallpapers/` continuam sendo usados pelo slideshow otimizado.
- Gradiente forte à esquerda mantém legibilidade do menu enquanto preserva a arte na metade direita.
- Logo, título GATE OPEN / KAIHOU! e menu vertical passam a formar a identidade principal da Home.
- Conta, Sobre e Patch Notes continuam acessíveis em controles compactos no topo.

## Partida Local
- `Partida Local` abre um submenu em vez de iniciar diretamente um setup.
- `Jogo Livre` usa o modo local atual, com controle dos dois lados.
- `Eternal CPU` abre o setup da IA atual com Fácil, Normal e Difícil.
- Voltar de ambos retorna ao submenu Partida Local.

## Multiplayer Online
- `Multiplayer Online` abre as opções `Partida Normal` e `Partida Ranqueada`.
- Partida Normal preserva o fluxo já validado: matchmaking rápido, criar sala e entrar por código.
- Partida Ranqueada ganha a primeira tela de pré-temporada com conta, deck selecionado, validação, tiers e RP.
- O matchmaking/rating Ranqueado ainda não é gravado nem executado nesta versão; a fila Normal permanece separada.

## Loja
- Nova entrada Loja no menu principal.
- A página é uma fundação para conteúdo futuro e não altera economia, cartas ou regras atuais.

## Navegação
- O App preserva o contexto do submenu ao voltar de Local, CPU e Online.
- A nova Home possui layout responsivo e suporte a `prefers-reduced-motion`.
