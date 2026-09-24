# Battle Spirits Eternal Simulator v3.1.0 — Arena 2D

Data: 23/09/2026

## Arena
- Nova direção visual 2D em tela cheia, mantendo o Rules Engine da v3.
- Playmat redesenhado com profundidade obtida apenas por CSS, sem Three.js ou React Three Fiber.
- Jogador local permanece embaixo e oponente em cima.
- Zonas Braves / Other, Spirits / Ultimates e Nexus ganharam hierarquia visual mais clara.
- HUDs dos jogadores foram compactados para liberar mais área útil para as cartas.

## Mão e cartas
- Mão agora usa disposição em leque calculada dinamicamente.
- Hover eleva e amplia cartas da mão local.
- Carta selecionada recebe destaque próprio.
- Preview no hover foi ampliado e mostra nome, código e tipo.
- Cartas no campo receberam elevação sutil no hover e leitura mais clara do estado exaurido.

## Interface
- Barra superior compacta com avanço rápido de fase.
- Painéis Carta e Turno podem ser recolhidos para maximizar a arena.
- Reserve e Core Trash receberam aparência integrada à mesa.
- Deck, Burst e Trash foram estilizados como pilhas/zonas físicas da arena.
- Foco de ataque escurece elementos secundários e preserva alvos relevantes.
- Ajustes responsivos para desktops menores e telas com pouca altura.
- Respeito a `prefers-reduced-motion`.

## Compatibilidade
- Nenhuma dependência 3D foi adicionada.
- Engine, ações, Online e estrutura de dados permanecem compatíveis com a base v3.
