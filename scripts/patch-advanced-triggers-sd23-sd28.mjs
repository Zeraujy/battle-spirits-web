import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const backupDir = path.join(root, "backup");
fs.mkdirSync(backupDir, { recursive: true });

const colors = [
  ["red", "Vermelho", "Red"],
  ["purple", "Roxo", "Purple"],
  ["green", "Verde", "Green"],
  ["white", "Branco", "White"],
  ["yellow", "Amarelo", "Yellow"],
  ["blue", "Azul", "Blue"]
];

function stamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-");
}

function asCards(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.cards)) return data.cards;
  return null;
}

function ensureAbility(card, ability) {
  card.abilities = Array.isArray(card.abilities) ? card.abilities : [];
  const index = card.abilities.findIndex((entry) => entry?.id === ability.id);
  if (index >= 0) card.abilities[index] = ability;
  else card.abilities.push(ability);
}

function findEffect(card, id, type) {
  card.effects = Array.isArray(card.effects) ? card.effects : [];
  return card.effects.find((entry) => entry?.id === id) ||
    card.effects.find((entry) => String(entry?.type || "").replace(/[\s_-]+/g, "").toLowerCase() === type);
}

function patchCard(card) {
  if (!card?.id) return false;
  let changed = false;

  if (card.id === "SD23-X01") {
    ensureAbility(card, {
      id: "sd23-x01-utrigger-hit-v2",
      event: "ultimateTriggerHit",
      levels: [3, 4, 5],
      actions: [
        { type: "cannotBeBlockedByLowerLevel" }
      ]
    });

    const critical = findEffect(card, "sd23-x01-critical-hit", "criticalhit");
    if (critical) {
      critical.timing = "ultimateTriggerHit";
      critical.condition = {
        type: "ultimateTriggerRevealedCardType",
        cardType: "magic"
      };
      critical.operations = [
        {
          type: "chooseOption",
          titlePT: "Critical Hit",
          titleEN: "Critical Hit",
          instructionPT: "Escolha uma cor. Todas as Magics dessa cor no seu Trash voltam para a sua mão.",
          instructionEN: "Choose a color. Return all Magic cards of that color from your Trash to your hand.",
          options: colors.map(([color, pt, en]) => ({
            id: color,
            labelPT: pt,
            labelEN: en,
            actions: [
              {
                type: "returnAllTrashMatchingToHand",
                selector: {
                  owner: "self",
                  cardTypes: ["magic"],
                  colors: [color]
                }
              }
            ]
          }))
        }
      ];
    }
    changed = true;
  }

  if (card.id === "SD28-009") {
    ensureAbility(card, {
      id: "sd28-009-utrigger-hit-v2",
      event: "ultimateTriggerHit",
      levels: [4, 5],
      actions: [
        {
          type: "selectMultipleTargets",
          titlePT: "Ultimate Trigger — HIT",
          titleEN: "Ultimate Trigger — HIT",
          instructionPT: "Escolha 2 Spirits do oponente para dar Exhaust. Se houver menos de 2, resolva o máximo possível.",
          instructionEN: "Choose 2 opposing Spirits to exhaust. If fewer than 2 are available, resolve as many as possible.",
          selector: {
            owner: "opponent",
            cardTypes: ["spirit"]
          },
          maxTargets: 2,
          asManyAsPossible: true,
          onConfirm: { type: "exhaust" }
        }
      ]
    });

    const xu = findEffect(card, "sd28-009-xu-trigger-display", "xutrigger");
    if (xu) {
      xu.condition = {
        type: "ownLifeAtMost",
        value: 3
      };
      xu.operations = [
        {
          type: "moveLifeToTrash",
          player: "opponent",
          amount: 1
        }
      ];
    }
    changed = true;
  }

  if (card.id === "SD28-013") {
    const counter = findEffect(card, "sd28-013-counter-display", "triggercounter");
    if (counter) {
      counter.timing = "triggerCounter";
      counter.operations = [
        {
          type: "conditional",
          condition: {
            type: "ultimateTriggerRevealedColor",
            color: "green"
          },
          actions: [
            { type: "negateUltimateTrigger" }
          ]
        }
      ];
    }
    changed = true;
  }

  if (card.id === "SD28-008") {
    ensureAbility(card, {
      id: "sd28-008-utrigger-hit-v2",
      event: "ultimateTriggerHit",
      levels: [4],
      requiresCombined: true,
      actions: [
        {
          type: "selectTarget",
          titlePT: "Ultimate Trigger — HIT",
          titleEN: "Ultimate Trigger — HIT",
          instructionPT: "Escolha 1 Spirit do oponente em Exhaust para devolver ao topo do deck do dono.",
          instructionEN: "Choose 1 exhausted opposing Spirit to return to the top of its owner's deck.",
          selector: {
            owner: "opponent",
            cardTypes: ["spirit"],
            exhausted: true
          },
          onSelect: { type: "returnToTopDeck" }
        }
      ]
    });
    changed = true;
  }

  return changed;
}

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`[PULAR] ${path.relative(root, filePath)} não encontrado.`);
    return { patched: 0, found: [] };
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const cards = asCards(data);
  if (!cards) throw new Error(`Estrutura JSON desconhecida em ${filePath}`);

  const found = [];
  let patched = 0;
  for (const card of cards) {
    if (["SD23-X01", "SD28-009", "SD28-013", "SD28-008"].includes(card?.id)) {
      found.push(card.id);
      if (patchCard(card)) patched += 1;
    }
  }

  if (patched > 0) {
    const backup = path.join(backupDir, `${path.basename(filePath, ".json")}-before-advanced-triggers-${stamp()}.json`);
    fs.copyFileSync(filePath, backup);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log(`[OK] ${path.relative(root, filePath)}: ${patched} carta(s) atualizada(s).`);
  } else {
    console.log(`[OK] ${path.relative(root, filePath)}: nenhuma carta-alvo encontrada.`);
  }

  return { patched, found };
}

const results = [
  patchFile(path.join(root, "src", "data", "SD23.json")),
  patchFile(path.join(root, "src", "data", "SD28.json")),
  patchFile(path.join(root, "src", "data", "cards.json"))
];

const allFound = new Set(results.flatMap((result) => result.found));
console.log("");
console.log("Patch de Trigger avançado concluído.");
console.log(`IDs encontrados: ${[...allFound].sort().join(", ") || "nenhum"}`);
console.log("");
console.log("Esperados para suporte automático desta versão:");
console.log("- SD23-X01  Critical Hit + restrição de bloqueio por Level");
console.log("- SD28-008  Ultimate Trigger enquanto combinado");
console.log("- SD28-009  Ultimate Trigger + XU Trigger");
console.log("- SD28-013  Trigger Counter (Counter Bind)");
