# Battle Spirits Eternal Simulator — v3.5.2c

## Banner Image Wiring Fix

Hotfix cumulativo para restaurar corretamente as imagens dos novos banners VS.

### Corrigido
- A **carta de capa do deck selecionado** volta a aparecer como arte principal do banner.
- A **foto de perfil do jogador** volta a aparecer no quadro menor.
- Jogo Livre, Eternal CPU, Online Normal e Ranked recebem explicitamente o novo wiring de `bannerSrc` e `avatarSrc`.
- O resolvedor de capa aceita IDs de capa/formatos legados com mais tolerância e usa a primeira carta válida do deck como fallback.
- O patch é cumulativo e não depende da ordem exata em que v3.5.2, v3.5.2a e v3.5.2b foram instaladas.

### Mantido
- Molduras por Rank/tier.
- Nome do jogador no topo.
- Botão `Trocar deck`.
- Banner limpo, sem textos auxiliares sobre a arte.

Nenhuma regra de jogo foi alterada.
