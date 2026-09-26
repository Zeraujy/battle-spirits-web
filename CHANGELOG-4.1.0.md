# Battle Spirits Eternal Simulator v4.1.0
## Card Database Expansion Framework

### Catálogo
- O runtime agora carrega arquivos JSON recursivamente em `src/data`, incluindo `src/data/sets/`.
- Sets novos podem ficar em arquivos independentes sem aumentar indefinidamente o `cards.json` principal.
- Metadados opcionais de set são reconhecidos quando o JSON usa `{ set, cards }`.

### Ferramentas de expansão
- `npm run cards:template -- <SET>` cria uma área de preparação para um novo set.
- `npm run cards:import -- ...` valida e importa JSON + imagens.
- `npm run cards:sync` sincroniza automaticamente a contagem leve do catálogo.
- `npm run cards:validate` verifica estrutura de cards e referências locais de imagem.
- `npm run cards:check` executa a esteira de validação do catálogo.

### Segurança e compatibilidade
- IDs duplicados na mesma importação são rejeitados.
- Colisões com IDs existentes em outros arquivos são bloqueadas pelo importador.
- O fluxo antigo de arquivos diretamente em `src/data/` continua compatível.
- A importação não converte texto livre de efeitos em regras automáticas.

### Documentação
- Novo guia `docs/card-database/ADDING-NEW-SETS.md`.
- `docs/DATABASE-FORMAT.md` atualizado para a arquitetura 4.1.
