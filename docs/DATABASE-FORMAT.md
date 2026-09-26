# Compatibilidade do database

O rebuild lê **todos os arquivos `.json` de `src/data/`**. Assim você pode manter `cards.json` consolidado, arquivos por starter deck/set, ou ambos. IDs repetidos são deduplicados pelo último arquivo carregado pelo bundler/servidor.

## Campos reconhecidos

A camada `cardAdapter.js` aceita aliases para manter compatibilidade com bases antigas:

- ID: `id`, `cardNumber`, `number`
- Tipo: `cardType`, `type`, `card_type`
- Nome: `namePT`, `namePTBR`, `nameEN`, `name`
- Cor: `colors`, `color`
- Custo: `cost`
- Reduções: `reduction`, `reductions`, `reductionSymbols`
- Símbolos: `symbols`, `symbol`
- Levels: `levels[]` com `level/lv`, `cores/core/cost` e `bp/BP`
- Efeitos: `effects[]`
- Famílias: `families[]`
- Subtipos: `subtypes[]`
- Imagem: `image`, `imagePath`, `imageUrl`, `frontImage`, ou `setCode + imageFile`
- Brave: `braveCondition`, `combineCondition`, `braveBP`, `bpPlus`
- Ultimate: `summonCondition` / efeito `type: "summonCondition"`
- Mirage: `mirage: { cost, reduction }` ou `mirageCost` + `mirageReduction`

Caminhos de imagem com `public/`, barras do Windows (`\\`) e caminhos relativos são normalizados automaticamente.

## Exemplo de Brave

```json
{
  "id": "SD17-005",
  "namePT": "Exemplo Brave",
  "cardType": "brave",
  "colors": ["red"],
  "cost": 4,
  "reduction": ["red", "red"],
  "symbols": ["red"],
  "levels": [{ "level": 1, "cores": 1, "bp": 3000 }],
  "braveBP": 4000,
  "braveCondition": {
    "cardTypes": ["spirit"],
    "colors": ["red"],
    "minCost": 4
  }
}
```

## Exemplo de Ultimate

```json
{
  "id": "U-EXAMPLE",
  "cardType": "ultimate",
  "cost": 6,
  "symbols": ["ultimate"],
  "levels": [
    { "level": 3, "cores": 1, "bp": 10000 },
    { "level": 4, "cores": 3, "bp": 15000 }
  ],
  "effects": [
    {
      "type": "summonCondition",
      "condition": { "cardType": "spirit", "color": "red", "minCount": 1 }
    },
    {
      "type": "ultimateTrigger",
      "timing": "whenAttacks"
    }
  ]
}
```

## Operações automáticas simples

Efeitos estruturados podem usar `operations`. A engine atual reconhece operações simples como `draw`, `reserveCoreFromVoid`, `temporaryBP`, `refresh` e `exhaust`. Operações mais complexas caem no painel de resolução manual até receberem um handler específico.

Isso evita interpretar texto de carta livre de forma errada e torna cada nova automação testável.

## Estrutura de sets na v4.1.0

Novos sets podem ser mantidos separadamente em `src/data/sets/<SET>.json`. O runtime carrega JSONs recursivamente dentro de `src/data`, preservando compatibilidade com os arquivos antigos.

Para novos imports, prefira o fluxo documentado em `docs/card-database/ADDING-NEW-SETS.md` e os comandos `cards:template`, `cards:import`, `cards:sync` e `cards:validate`.
