import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supportsActionType } from "../../src/game/effectEngine/actionResolver.js";
import { listSupportedCoreActionTypes } from "../../src/game/effectEngine/coreActionLibrary.js";
import {
  CANONICAL_EVENT_VALUES,
  EffectEvent,
  isCanonicalEvent,
  isRuntimeDispatchedEvent,
  normalizeCanonicalEvent
} from "../../src/game/effectEngine/canonicalEvents.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CARD_PATH = path.join(ROOT, "src/data/cards.json");
const JSON_OUT = path.join(ROOT, "data/effect-coverage.json");
const MD_OUT = path.join(ROOT, "docs/effects/CARD-EFFECT-COVERAGE.md");
const CHECK_ONLY = process.argv.includes("--check");

export const CoverageStatus = Object.freeze({
  AUTOMATED: "AUTOMATED",
  PARTIAL: "PARTIAL",
  MANUAL: "MANUAL",
  UNSUPPORTED_TRIGGER: "UNSUPPORTED_TRIGGER",
  UNSUPPORTED_CONDITION: "UNSUPPORTED_CONDITION",
  UNSUPPORTED_ACTION: "UNSUPPORTED_ACTION",
  UNSTRUCTURED_TEXT: "UNSTRUCTURED_TEXT",
  NO_EFFECT: "NO_EFFECT"
});

const SUPPORTED_TYPED_CONDITIONS = new Set([
  "controlsSymbolColor",
  "controlsCardType",
  "controlsColor",
  "controlsFamily",
  "ownLifeAtMost",
  "lifeAtMost",
  "lifeAtLeast",
  "handSize",
  "reserve",
  "trashCores",
  "fieldCount",
  "symbolCount",
  "phase",
  "activePlayer",
  "sourceLevel",
  "sourceCost",
  "sourceState",
  "sourceCombined",
  "soulCoreLocation",
  "battleState",
  "ultimateTriggerRevealedCardType",
  "ultimateTriggerRevealedColor",
  "ultimateTriggerWasHit",
  "attackNumber",
  "sourceAttackNumber",
  "eventSourceCardType",
  "eventSourceColor",
  "eventSourceCost",
  "eventSourceBP",
  "eventSourceFamily",
  "eventCause",
  "eventDestroyedByOpponent", "eventDestroyedBySelf", "battleAttackerBP", "battleAttackerCardType", "eventDestroyerKeyword",
  "eventDestroyedByCardType",
  "battleOnlyOpponentSpiritDestroyed",
  "battleSourceRole",
  "selectedTargetBP",
  "battleBlockerCardType",
  "battleRestriction",
  "eventMovedCardFamily",
  "eventMoveDestination",
  "eventMovedFromZone",
  "eventMovedByOpponent",
  "eventMovedByCardType",
  "eventZeroedBySource",
  "eventFirstTimeThisTurn",
  "eventZeroedIsBattleOpponent",
  "eventSourceIsCombinedHost",
  "combinedHostLacksEffectType"
]);

const KNOWN_CONDITION_KEYS = new Set([
  "type", "all", "and", "any", "or", "not",
  "phase", "phases", "ownerTurn", "opponentTurn", "activePlayer",
  "level", "minimumLevel", "minLevel", "maximumLevel", "maxLevel",
  "combinedWithBrave", "exhausted", "refreshed", "life",
  "controls", "control",
  // typed-condition parameters
  "color", "colors", "cardType", "cardTypes", "value", "min", "max",
  "atLeast", "atMost", "equals", "count", "minCount", "family", "families",
  "minimumCost", "maximumCost", "minCost", "maxCost",
  "player", "owner", "operator", "selector", "zone", "directAttack",
  "attackerPlayer", "blocked", "cardType", "cause", "keyword", "keywords", "role",
  "values", "destinations", "destination", "key", "effectType"
]);

const NESTED_ACTION_KEYS = [
  "actions", "operations", "ops", "then", "else", "onTrue", "onFalse",
  "onSelect", "onConfirm", "afterSelect", "afterConfirm", "afterIfAny",
  "yesActions", "noActions", "onYes", "onNo"
];

function loadCards() {
  const raw = JSON.parse(fs.readFileSync(CARD_PATH, "utf8"));
  return Array.isArray(raw) ? raw : (Array.isArray(raw.cards) ? raw.cards : Object.values(raw));
}

function cardText(card) {
  const value = card.effectText ?? card.text ?? card.description ?? "";
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  return String(value.en ?? value.ptBR ?? value.pt ?? "").trim();
}

function hasExplicitNoEffectText(card) {
  const text = cardText(card).toLowerCase();
  return /\b(this card has no effect|no effect)\b/.test(text)
    || /\b(n[aã]o possui efeito|sem efeito)\b/.test(text);
}

function collectConditions(condition, issues = []) {
  if (!condition) return issues;
  if (Array.isArray(condition)) {
    for (const item of condition) collectConditions(item, issues);
    return issues;
  }
  if (typeof condition !== "object") return issues;

  if (condition.type && !SUPPORTED_TYPED_CONDITIONS.has(String(condition.type))) {
    issues.push({ kind: "type", value: String(condition.type) });
  }

  for (const key of Object.keys(condition)) {
    if (!KNOWN_CONDITION_KEYS.has(key)) issues.push({ kind: "key", value: key });
  }

  for (const key of ["all", "and", "any", "or", "not"]) {
    collectConditions(condition[key], issues);
  }
  return issues;
}

function collectActions(value, result = { types: [], unsupported: [], conditionIssues: [] }) {
  if (!value) return result;
  if (Array.isArray(value)) {
    for (const item of value) collectActions(item, result);
    return result;
  }
  if (typeof value !== "object") return result;

  if (value.type) {
    const type = String(value.type);
    result.types.push(type);
    if (!supportsActionType(type)) result.unsupported.push(type);
  }
  if (value.condition) collectConditions(value.condition, result.conditionIssues);

  for (const key of NESTED_ACTION_KEYS) collectActions(value[key], result);
  if (Array.isArray(value.options)) {
    for (const option of value.options) collectActions(option?.actions ?? option?.operations ?? option, result);
  }
  return result;
}

function entryEvent(entry = {}) {
  const raw = entry.trigger?.event ?? entry.event ?? entry.timing ?? entry.type ?? "";
  return {
    raw: String(raw || ""),
    canonical: normalizeCanonicalEvent(raw)
  };
}

function inspectEntry(entry, source, index) {
  const event = entryEvent(entry);
  const actions = entry.actions ?? entry.operations ?? entry.ops ?? [];
  const actionInfo = collectActions(actions);
  const conditionIssues = collectConditions(
    entry.condition ?? entry.conditions ?? entry.requirements ?? null,
    [...actionInfo.conditionIssues]
  );
  const actionCount = actionInfo.types.length;
  const hasModifiers = Boolean(entry.modifiers && Object.keys(entry.modifiers).length);
  const canonicalEvent = Boolean(event.canonical && isCanonicalEvent(event.canonical));
  const dispatched = Boolean(event.canonical && isRuntimeDispatchedEvent(event.canonical));
  const unsupportedActions = [...new Set(actionInfo.unsupported)].sort();
  const unsupportedConditions = [...new Set(conditionIssues.map((issue) => `${issue.kind}:${issue.value}`))].sort();

  const compactType = String(entry?.type || "").replace(/[\s_-]+/g, "").toLowerCase();
  const engineNative = ["summoncondition", "ultimatetrigger", "ultimatetriggerbattle", "criticalhit", "xutrigger", "triggercounter", "highspeed"].includes(compactType);
  let status = CoverageStatus.MANUAL;
  if (engineNative) status = CoverageStatus.AUTOMATED;
  else if (!canonicalEvent) status = CoverageStatus.UNSUPPORTED_TRIGGER;
  else if (!dispatched) status = CoverageStatus.UNSUPPORTED_TRIGGER;
  else if (unsupportedConditions.length) status = CoverageStatus.UNSUPPORTED_CONDITION;
  else if (unsupportedActions.length) status = CoverageStatus.UNSUPPORTED_ACTION;
  else if (actionCount > 0 || hasModifiers) status = CoverageStatus.AUTOMATED;
  else status = CoverageStatus.MANUAL;

  return {
    id: entry.id ?? `${source}-${index + 1}`,
    source,
    schemaVersion: Number(entry.schemaVersion ?? entry.schema ?? 0) || null,
    triggerScope: entry.trigger?.scope || null,
    eventPlayer: entry.trigger?.eventPlayer || null,
    rawEvent: event.raw || null,
    canonicalEvent: event.canonical || null,
    canonicalEventDefined: canonicalEvent,
    runtimeDispatched: dispatched,
    actionTypes: [...new Set(actionInfo.types)].sort(),
    unsupportedActions,
    unsupportedConditions,
    hasModifiers,
    hasStructuredActions: actionCount > 0,
    automationRef: entry.automationRef || null,
    engineNative,
    entryType: compactType,
    status
  };
}

function canCoverDisplayEntry(display, executableEntries, allEntries = []) {
  if (display.automationRef) {
    return allEntries.some((entry) => entry.id === display.automationRef && entry.status === CoverageStatus.AUTOMATED);
  }
  if (display.engineNative) return true;
  if (!display.canonicalEvent) return false;
  return executableEntries.some((entry) =>
    entry.status === CoverageStatus.AUTOMATED
    && entry.canonicalEvent === display.canonicalEvent
  ) || allEntries.some((entry) => entry.hasModifiers && entry.status === CoverageStatus.AUTOMATED && entry.canonicalEvent === display.canonicalEvent);
}

function inspectCard(card) {
  const effects = (card.effects || []).map((entry, index) => inspectEntry(entry, "effects", index));
  const abilities = (card.abilities || []).map((entry, index) => inspectEntry(entry, "abilities", index));
  const all = [...effects, ...abilities];
  const executable = all.filter((entry) => entry.hasStructuredActions);
  const automatedExecutable = executable.filter((entry) => entry.status === CoverageStatus.AUTOMATED);
  const automatedEffective = all.filter((entry) => entry.status === CoverageStatus.AUTOMATED && (entry.hasStructuredActions || entry.hasModifiers || entry.engineNative));
  const displayOnly = effects.filter((entry) => !entry.hasStructuredActions);
  const structuredBraveCondition = Boolean(
    card.braveCondition
    && typeof card.braveCondition === "object"
    && !Array.isArray(card.braveCondition)
    && Object.keys(card.braveCondition).length
  );
  const unresolvedDisplay = displayOnly.filter((entry) => {
    if (entry.entryType === "combinecondition" && structuredBraveCondition) return false;
    return !canCoverDisplayEntry(entry, automatedExecutable, all);
  });
  const noEntries = all.length === 0;
  const explicitNoEffect = hasExplicitNoEffectText(card);

  const issueStatuses = new Set(
    executable
      .map((entry) => entry.status)
      .filter((status) => status !== CoverageStatus.AUTOMATED)
  );
  for (const entry of unresolvedDisplay) issueStatuses.add(entry.status);

  let status;
  if (noEntries && explicitNoEffect) {
    status = CoverageStatus.NO_EFFECT;
  } else if (noEntries) {
    status = CoverageStatus.UNSTRUCTURED_TEXT;
  } else if (automatedEffective.length > 0 && issueStatuses.size === 0) {
    status = CoverageStatus.AUTOMATED;
  } else if (automatedEffective.length > 0) {
    status = CoverageStatus.PARTIAL;
  } else if (issueStatuses.has(CoverageStatus.UNSUPPORTED_ACTION)) {
    status = CoverageStatus.UNSUPPORTED_ACTION;
  } else if (issueStatuses.has(CoverageStatus.UNSUPPORTED_CONDITION)) {
    status = CoverageStatus.UNSUPPORTED_CONDITION;
  } else if (issueStatuses.has(CoverageStatus.UNSUPPORTED_TRIGGER)) {
    status = CoverageStatus.UNSUPPORTED_TRIGGER;
  } else {
    status = CoverageStatus.MANUAL;
  }

  return {
    cardId: String(card.id),
    set: String(card.set || card.setCode || "UNKNOWN"),
    cardType: String(card.cardType || card.type || "unknown"),
    nameEN: card.nameEN || card.name || null,
    status,
    explicitNoEffect,
    documentedEffectCount: effects.length,
    executableEntryCount: executable.length,
    automatedExecutableCount: automatedExecutable.length,
    unresolvedDisplayCount: unresolvedDisplay.length,
    entries: all,
    gaps: {
      unsupportedTriggers: [...new Set(all.filter((entry) => entry.status === CoverageStatus.UNSUPPORTED_TRIGGER).map((entry) => entry.rawEvent || "(missing)"))].sort(),
      unsupportedConditions: [...new Set(all.flatMap((entry) => entry.unsupportedConditions))].sort(),
      unsupportedActions: [...new Set(all.flatMap((entry) => entry.unsupportedActions))].sort(),
      unresolvedDisplayEntries: unresolvedDisplay.map((entry) => entry.id)
    }
  };
}

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function summarize(cards) {
  const byStatus = countBy(cards, (card) => card.status);
  const bySet = {};
  for (const card of cards) {
    bySet[card.set] ||= { total: 0, statuses: {} };
    bySet[card.set].total += 1;
    bySet[card.set].statuses[card.status] = (bySet[card.set].statuses[card.status] || 0) + 1;
  }
  for (const value of Object.values(bySet)) {
    value.automationPercent = value.total
      ? Number((((value.statuses.AUTOMATED || 0) / value.total) * 100).toFixed(1))
      : 0;
  }

  const entries = cards.flatMap((card) => card.entries.map((entry) => ({ ...entry, cardId: card.cardId, set: card.set })));
  return {
    totalCards: cards.length,
    totalSets: Object.keys(bySet).length,
    byStatus,
    bySet,
    entries: {
      total: entries.length,
      automated: entries.filter((entry) => entry.status === CoverageStatus.AUTOMATED).length,
      runtimeUnsupportedTrigger: entries.filter((entry) => entry.status === CoverageStatus.UNSUPPORTED_TRIGGER).length,
      unsupportedCondition: entries.filter((entry) => entry.status === CoverageStatus.UNSUPPORTED_CONDITION).length,
      unsupportedAction: entries.filter((entry) => entry.status === CoverageStatus.UNSUPPORTED_ACTION).length,
      manual: entries.filter((entry) => entry.status === CoverageStatus.MANUAL).length,
      schemaV2: entries.filter((entry) => entry.schemaVersion === 2).length
    },
    gapFrequency: {
      triggers: countBy(entries.filter((entry) => entry.status === CoverageStatus.UNSUPPORTED_TRIGGER), (entry) => entry.rawEvent || "(missing)"),
      conditions: countBy(cards.flatMap((card) => card.gaps.unsupportedConditions.map((value) => ({ value }))), (item) => item.value),
      actions: countBy(cards.flatMap((card) => card.gaps.unsupportedActions.map((value) => ({ value }))), (item) => item.value)
    }
  };
}

function percent(value, total) {
  return total ? `${((value / total) * 100).toFixed(1)}%` : "0.0%";
}

function markdown(report) {
  const { summary, cards } = report;
  const lines = [];
  lines.push("# Card Effect Coverage — v5.1.0 Card Effects & Mechanics Engine (Phase 0–20)");
  lines.push("");
  lines.push("> Scope: runtime gameplay catalog (`src/data/cards.json`). Artwork-only/public database records that are not loaded into the gameplay catalog are intentionally excluded.");
  lines.push("");
  lines.push("## Baseline");
  lines.push("");
  lines.push(`- Runtime cards audited: **${summary.totalCards}**`);
  lines.push(`- Sets audited: **${summary.totalSets}**`);
  lines.push(`- Structured effect/ability entries inspected: **${summary.entries.total}**`);
  lines.push(`- Effect Schema v2 entries: **${summary.entries.schemaV2 || 0}**`);
  lines.push(`- Fully automated cards: **${summary.byStatus.AUTOMATED || 0} (${percent(summary.byStatus.AUTOMATED || 0, summary.totalCards)})**`);
  lines.push(`- Partially automated cards: **${summary.byStatus.PARTIAL || 0}**`);
  lines.push(`- Unstructured effect text: **${summary.byStatus.UNSTRUCTURED_TEXT || 0}**`);
  lines.push(`- Explicit no-effect cards: **${summary.byStatus.NO_EFFECT || 0}**`);
  lines.push("");
  lines.push("The audit is intentionally conservative. A card is only `AUTOMATED` when its executable entries use a canonical event that is currently dispatched by the runtime, all conditions are understood, all action types are supported, and no documented effect remains unresolved.");
  lines.push("");
  lines.push("## Status legend");
  lines.push("");
  lines.push("| Status | Meaning |");
  lines.push("| --- | --- |");
  lines.push("| `AUTOMATED` | Runtime can dispatch and resolve every mapped effect entry. |");
  lines.push("| `PARTIAL` | At least one effect is automated, but another documented/mechanical part is unresolved. |");
  lines.push("| `MANUAL` | Effect is represented, but still lacks executable operations. |");
  lines.push("| `UNSUPPORTED_TRIGGER` | Trigger exists in data but is not yet canonical/runtime-dispatched. |");
  lines.push("| `UNSUPPORTED_CONDITION` | Trigger/action path exists, but a condition is not understood. |");
  lines.push("| `UNSUPPORTED_ACTION` | Structured operation type is not implemented by the resolver. |");
  lines.push("| `UNSTRUCTURED_TEXT` | Card has gameplay text but no structured effect/ability entries. |");
  lines.push("| `NO_EFFECT` | Card explicitly states that it has no effect. |");
  lines.push("");
  lines.push("## Coverage by set");
  lines.push("");
  lines.push("| Set | Cards | Automated | Partial | Manual | Unsupported trigger | Unsupported condition | Unsupported action | Unstructured | No effect |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const [set, row] of Object.entries(summary.bySet).sort(([a], [b]) => a.localeCompare(b))) {
    const s = row.statuses;
    lines.push(`| ${set} | ${row.total} | ${s.AUTOMATED || 0} | ${s.PARTIAL || 0} | ${s.MANUAL || 0} | ${s.UNSUPPORTED_TRIGGER || 0} | ${s.UNSUPPORTED_CONDITION || 0} | ${s.UNSUPPORTED_ACTION || 0} | ${s.UNSTRUCTURED_TEXT || 0} | ${s.NO_EFFECT || 0} |`);
  }
  lines.push("");
  lines.push("## Structured entry baseline");
  lines.push("");
  lines.push(`- Automated executable entries: **${summary.entries.automated}**`);
  lines.push(`- Entries blocked by trigger coverage: **${summary.entries.runtimeUnsupportedTrigger}**`);
  lines.push(`- Entries blocked by condition coverage: **${summary.entries.unsupportedCondition}**`);
  lines.push(`- Entries blocked by action coverage: **${summary.entries.unsupportedAction}**`);
  lines.push(`- Represented but non-executable/manual entries: **${summary.entries.manual}**`);
  lines.push("");
  lines.push("## Highest-priority trigger gaps");
  lines.push("");
  const triggerRows = Object.entries(summary.gapFrequency.triggers).sort((a, b) => b[1] - a[1]);
  if (!triggerRows.length) lines.push("No trigger gaps detected.");
  else {
    lines.push("| Trigger/timing | Entries |");
    lines.push("| --- | ---: |");
    for (const [name, count] of triggerRows.slice(0, 30)) lines.push(`| \`${name}\` | ${count} |`);
  }
  lines.push("");
  lines.push("## Unsupported action/condition gaps");
  lines.push("");
  const actionRows = Object.entries(summary.gapFrequency.actions).sort((a, b) => b[1] - a[1]);
  const conditionRows = Object.entries(summary.gapFrequency.conditions).sort((a, b) => b[1] - a[1]);
  lines.push(`- Unsupported action types: ${actionRows.length ? actionRows.map(([name, count]) => `\`${name}\` (${count})`).join(", ") : "none"}`);
  lines.push(`- Unsupported condition forms: ${conditionRows.length ? conditionRows.map(([name, count]) => `\`${name}\` (${count})`).join(", ") : "none"}`);
  lines.push("");
  lines.push("## Engine additions — Phases 7–18");
  lines.push("");
  lines.push(`- Core Action Library is centralized and currently exposes **${listSupportedCoreActionTypes().length} generic action types** to Schema v2.`);
  lines.push("- Continuous effects use `match.modifierRegistry` rather than one-shot state mutation.");
  lines.push("- Effective BP, Cost, Symbols and Colors can consume continuous modifiers dynamically.");
  lines.push("- Canonical durations: `thisBattle`, `thisAttack`, `thisTurn`, `untilEndStep`, `whileSourceExists`, `whileConditionTrue`, `permanent`.");
  lines.push("- `continuous` is now runtime-dispatched for explicit Schema v2 source effects on Summon/Deploy; legacy continuous text remains untouched until migrated.");
  lines.push("- Replacement/prevention windows now cover `wouldBeDestroyed` and `wouldLoseLife` with declarative `preventEvent` / `replaceEvent` actions.");
  lines.push("- Battle flow now dispatches `whenBlocked`, `whenBattles`, `beforeBattleResolution`, `afterBattleResolution`, and `lifeDecreased` with normalized battle context.");
  lines.push("- All seven turn phases now dispatch canonical step events; legacy `your/opponent/either` step timings have a narrow ambient compatibility path.");
  lines.push("- Magic, Burst and Brave automation now share the same decision/trigger infrastructure instead of falling back immediately to manual resolution.");
  lines.push("- Ultimate mechanics formalize HIT/GUARD, Trigger Counter, Critical Hit, XU Trigger and post-resolution events inside the canonical Effect Engine flow.");
  lines.push("- Complex Player Decisions now support targets, multiple cards, Yes/No, Hand/Trash/Deck selection, ordering and authoritative Core distribution.");
  lines.push("- Arena Effect Resolution UI renders structured decision panels and keeps the legacy manual panel as exceptional fallback only.");
  lines.push("");
  lines.push("## Canonical Event Model — Phase 1");
  lines.push("");
  lines.push("The canonical list is defined in `src/game/effectEngine/canonicalEvents.js`. Legacy aliases normalize into these names without changing current gameplay behavior.");
  lines.push("");
  lines.push("| Canonical event | Runtime dispatch today |");
  lines.push("| --- | --- |");
  for (const event of CANONICAL_EVENT_VALUES) lines.push(`| \`${event}\` | ${isRuntimeDispatchedEvent(event) ? "Yes" : "No — foundation only"} |`);
  lines.push("");
  lines.push("## Cards requiring work");
  lines.push("");
  lines.push("The JSON report contains every entry and machine-readable reason. This table lists every non-automated/non-vanilla card for migration planning.");
  lines.push("");
  lines.push("| Card | Set | Type | Status | Main gaps |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const card of cards.filter((card) => ![CoverageStatus.AUTOMATED, CoverageStatus.NO_EFFECT].includes(card.status))) {
    const gaps = [
      card.gaps.unsupportedTriggers.length ? `triggers: ${card.gaps.unsupportedTriggers.join(", ")}` : "",
      card.gaps.unsupportedConditions.length ? `conditions: ${card.gaps.unsupportedConditions.join(", ")}` : "",
      card.gaps.unsupportedActions.length ? `actions: ${card.gaps.unsupportedActions.join(", ")}` : "",
      card.gaps.unresolvedDisplayEntries.length ? `unresolved entries: ${card.gaps.unresolvedDisplayEntries.length}` : ""
    ].filter(Boolean).join("; ") || "structured operations missing";
    lines.push(`| \`${card.cardId}\` | ${card.set} | ${card.cardType} | \`${card.status}\` | ${gaps.replaceAll("|", "\\|")} |`);
  }
  lines.push("");
  lines.push("## Phase 4 input");
  lines.push("");
  lines.push("Effect Schema v2, Trigger Dispatcher, Effect Queue, Targeting Engine v2, and Condition Engine v2 are now available. This coverage report remains the migration contract for the next mechanics phases: migrate cards incrementally into the DSL while expanding the action library and trigger coverage without bypassing the dispatcher or queue.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

const inspectedCards = loadCards().map(inspectCard).sort((a, b) => a.cardId.localeCompare(b.cardId));
const report = {
  schemaVersion: 2,
  targetRelease: "5.1.0",
  phases: [0, 1, 2, 3],
  source: "src/data/cards.json",
  generatedAt: new Date().toISOString(),
  classificationVersion: "v5.1.0-phase03",
  canonicalEvents: CANONICAL_EVENT_VALUES.map((event) => ({ event, runtimeDispatched: isRuntimeDispatchedEvent(event) })),
  summary: summarize(inspectedCards),
  cards: inspectedCards
};

const jsonText = `${JSON.stringify(report, null, 2)}\n`;
const mdText = markdown(report);

if (CHECK_ONLY) {
  if (!fs.existsSync(JSON_OUT) || !fs.existsSync(MD_OUT)) {
    console.error("Effect coverage outputs are missing. Run: npm run effects:audit");
    process.exit(1);
  }
  const existingJson = JSON.parse(fs.readFileSync(JSON_OUT, "utf8"));
  const comparable = { ...report, generatedAt: existingJson.generatedAt };
  const expectedJson = `${JSON.stringify(comparable, null, 2)}\n`;
  if (fs.readFileSync(JSON_OUT, "utf8") !== expectedJson) {
    console.error("effect-coverage.json is stale. Run: npm run effects:audit");
    process.exit(1);
  }
  // Markdown has no generated timestamp, so direct comparison is stable.
  if (fs.readFileSync(MD_OUT, "utf8") !== mdText) {
    console.error("CARD-EFFECT-COVERAGE.md is stale. Run: npm run effects:audit");
    process.exit(1);
  }
  console.log(`Effect coverage is current: ${report.summary.totalCards} cards / ${report.summary.totalSets} sets.`);
} else {
  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.mkdirSync(path.dirname(MD_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, jsonText);
  fs.writeFileSync(MD_OUT, mdText);
  console.log(`Effect coverage generated: ${report.summary.totalCards} cards / ${report.summary.totalSets} sets.`);
  console.log(`JSON: ${path.relative(ROOT, JSON_OUT)}`);
  console.log(`Markdown: ${path.relative(ROOT, MD_OUT)}`);
}
