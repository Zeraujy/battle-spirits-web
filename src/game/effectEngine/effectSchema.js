import { supportsActionType } from "./actionResolver.js";
import {
  isCanonicalEvent,
  normalizeCanonicalEvent
} from "./canonicalEvents.js";

export const EFFECT_SCHEMA_VERSION = 2;

export const EffectTriggerScope = Object.freeze({
  SOURCE: "source",
  CONTROLLER_FIELD: "controllerField",
  CONTROLLER_HAND: "controllerHand",
  CONTROLLER_TRASH: "controllerTrash"
});

export const EventPlayerRelation = Object.freeze({
  SELF: "self",
  OPPONENT: "opponent",
  ANY: "any"
});

const TRIGGER_SCOPES = new Set(Object.values(EffectTriggerScope));
const EVENT_PLAYER_RELATIONS = new Set(Object.values(EventPlayerRelation));

export function isEffectSchemaV2(entry) {
  return Number(entry?.schemaVersion ?? entry?.schema ?? 0) === EFFECT_SCHEMA_VERSION;
}

export function normalizeConditions(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export function normalizeEffectSchemaV2(entry = {}) {
  const trigger = entry.trigger || {};
  const event = normalizeCanonicalEvent(trigger.event ?? entry.event ?? entry.timing ?? "");
  const scope = trigger.scope || EffectTriggerScope.SOURCE;
  const eventPlayer = trigger.eventPlayer || EventPlayerRelation.ANY;
  const actions = entry.actions ?? entry.operations ?? entry.ops ?? [];

  return {
    ...entry,
    schemaVersion: EFFECT_SCHEMA_VERSION,
    id: entry.id || null,
    trigger: {
      ...trigger,
      event,
      scope,
      eventPlayer
    },
    conditions: normalizeConditions(entry.conditions ?? entry.condition ?? entry.requirements ?? []),
    actions: Array.isArray(actions) ? actions : []
  };
}

function collectActionTypes(value, out = []) {
  if (!value) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectActionTypes(item, out);
    return out;
  }
  if (typeof value !== "object") return out;
  if (value.type) out.push(String(value.type));
  for (const key of ["actions", "operations", "ops", "then", "else", "onSelect", "onConfirm", "afterSelect", "afterConfirm", "afterIfAny", "yesActions", "noActions", "onYes", "onNo"]) {
    collectActionTypes(value[key], out);
  }
  if (Array.isArray(value.options)) {
    for (const option of value.options) collectActionTypes(option?.actions ?? option?.operations, out);
  }
  return out;
}

export function validateEffectSchemaV2(entry = {}) {
  const effect = normalizeEffectSchemaV2(entry);
  const errors = [];
  const warnings = [];

  if (!isEffectSchemaV2(effect)) errors.push("schemaVersion must be 2.");
  if (!effect.id) warnings.push("Effect has no stable id. A stable id is strongly recommended for migrations and tests.");
  if (!effect.trigger.event) errors.push("trigger.event is required.");
  else if (!isCanonicalEvent(effect.trigger.event)) errors.push(`Unknown canonical event: ${effect.trigger.event}.`);

  if (!TRIGGER_SCOPES.has(effect.trigger.scope)) {
    errors.push(`Unsupported trigger.scope: ${effect.trigger.scope}.`);
  }
  if (!EVENT_PLAYER_RELATIONS.has(effect.trigger.eventPlayer)) {
    errors.push(`Unsupported trigger.eventPlayer: ${effect.trigger.eventPlayer}.`);
  }

  if (!Array.isArray(effect.conditions)) errors.push("conditions must normalize to an array.");
  if (!Array.isArray(effect.actions)) errors.push("actions must be an array.");
  if (!effect.actions.length) warnings.push("Effect has no executable actions and will remain presentation/manual only.");

  const unsupportedActions = [...new Set(collectActionTypes(effect.actions).filter((type) => !supportsActionType(type)))];
  for (const type of unsupportedActions) errors.push(`Unsupported action type: ${type}.`);

  return {
    ok: errors.length === 0,
    effect,
    errors,
    warnings
  };
}

export function defineEffect(entry = {}) {
  const validation = validateEffectSchemaV2({ ...entry, schemaVersion: EFFECT_SCHEMA_VERSION });
  if (!validation.ok) {
    throw new TypeError(`Invalid Effect Schema v2: ${validation.errors.join(" ")}`);
  }
  return validation.effect;
}
