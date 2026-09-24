# Auditoria de referências de imagens das cartas

Esta validação é diferente da auditoria de resolução dos arquivos.

`audit-card-images.mjs` confirma que os arquivos de imagem existentes são legíveis e possuem boa resolução. Já `audit-runtime-card-references.mjs` reproduz a ordem do catálogo usada pelo simulador e garante que **cada carta final em runtime aponta para uma arte existente**.

## Estado deste hotfix

- Cartas únicas: 365
- Artes disponíveis: 365
- Referências ausentes: 0
- Arquivos referenciados ausentes: 0
- Overrides que herdam a arte do catálogo base: 70

Esses 70 overrides pertencem principalmente aos arquivos de dados de SD13, SD15, SD23 e SD28. Eles contêm regras/efeitos específicos, enquanto o caminho visual continua vindo de `cards.json`.
