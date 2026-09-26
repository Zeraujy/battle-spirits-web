# Adicionando novos sets — v4.1.0+

A linha 4.1 introduz uma esteira própria para expansão da database. O objetivo é permitir adicionar sets novos sem editar manualmente vários arquivos do simulador.

## Fluxo recomendado

### 1. Criar um template

```bash
npm run cards:template -- BSXX
```

Isso cria `card-imports/BSXX/` com:

- `cards.json`
- `images/`
- um README curto com o próximo comando

`card-imports/` é uma área local de trabalho e não deve entrar no release.

### 2. Preencher `cards.json`

Você pode usar um array simples de cartas ou o formato:

```json
{
  "set": {
    "code": "BSXX",
    "nameEN": "Set Name",
    "namePT": "Nome do Set",
    "releaseDate": "2026-01-01"
  },
  "cards": []
}
```

Os campos antigos continuam compatíveis. Consulte `docs/DATABASE-FORMAT.md`.

### 3. Adicionar as imagens

Coloque as artes em `images/`. O nome recomendado é o ID da carta:

```text
BSXX-001.webp
BSXX-002.webp
...
```

WebP continua sendo o formato preferido para manter carregamento e tamanho do projeto baixos.

### 4. Simular a importação

```bash
npm run cards:import -- --json card-imports/BSXX/cards.json --images card-imports/BSXX/images --set BSXX --dry-run
```

Nenhum arquivo é modificado nesse modo.

### 5. Importar

```bash
npm run cards:import -- --json card-imports/BSXX/cards.json --images card-imports/BSXX/images --set BSXX
```

O importador:

- valida IDs, tipos, custo, Levels e traduções básicas;
- detecta IDs duplicados;
- verifica as imagens;
- copia as imagens para `public/cards-database/BSXX/`;
- grava o set em `src/data/sets/BSXX.json`;
- mantém o restante do catálogo intacto.

Para substituir um set já importado use `--replace`.

### 6. Sincronizar e validar

```bash
npm run cards:sync
npm run cards:validate
npm run verify
npm test
```

Ou:

```bash
npm run cards:check
```

## Comandos novos

| Comando | Função |
|---|---|
| `npm run cards:template -- BSXX` | Cria uma pasta de preparação para um novo set |
| `npm run cards:import -- ...` | Importa JSON + imagens para o projeto |
| `npm run cards:sync` | Atualiza a contagem/manifesto leve do catálogo |
| `npm run cards:validate` | Valida schema e referências de imagem |
| `npm run cards:check` | Sincroniza e executa a validação completa da database |

## Compatibilidade

Os JSONs já existentes diretamente em `src/data/` continuam funcionando. A partir da v4.1.0, o runtime também carrega recursivamente `src/data/sets/*.json`, então novos sets podem ficar separados sem transformar `cards.json` em um arquivo gigantesco.

## Traduções

O importador não exige que PT e EN estejam completos para permitir trabalho gradual, mas emite avisos quando uma tradução está ausente. Para releases públicos, o recomendado é preencher pelo menos `nameEN`, `namePT` e `effectText.en`/`effectText.ptBR` quando houver texto de efeito.

## Segurança para efeitos

O framework de importação não tenta interpretar automaticamente texto livre de cartas como lógica de jogo. Efeitos automatizados continuam usando estruturas explícitas em `effects[]`/`operations`, para evitar criar regras incorretas a partir de tradução ou texto ambíguo.
