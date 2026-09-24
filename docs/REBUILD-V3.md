# Rebuild v3.0.0

Esta árvore foi criada como versão paralela para preservar a v2.2.0/linha atual como rollback. O objetivo é melhorar a experiência sem abandonar o trabalho já feito: engine de efeitos, fila de decisões, Brave, Ultimate, Ultimate Trigger avançado, painel de vitória/derrota, perfis, biblioteca de decks, detalhes 3D e fluxo Online foram tratados como partes do novo baseline.

A mudança estrutural principal é reduzir acoplamento. O Online ganha um ponto único de configuração, o servidor possui inicialização própria e a interface recebe uma camada visual v3 coerente. O menu inicial prioriza as duas ações que um jogador procura primeiro — Local e Online — e deixa criação de decks, perfil, conta e configurações como ferramentas secundárias.

O pacote é deliberadamente separado dos assets pesados do projeto atual. `MIGRAR-CONTEUDO-DO-V2.bat` copia `public/cards-database`, `public/images` e `src/data` da sua pasta v2 para a v3 sem modificar a origem. Isso permite testar e descartar o rebuild sem arriscar a versão estável.
