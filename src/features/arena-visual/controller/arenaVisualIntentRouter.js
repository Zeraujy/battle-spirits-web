import { ARENA_VISUAL_INTENTS } from "../interactions/arenaIntentFactory.js";

export function routeArenaVisualIntent(intent, handlers = {}) {
  if (!intent || typeof intent.type !== "string") return false;

  switch (intent.type) {
    case ARENA_VISUAL_INTENTS.SELECT_CARD:
    case ARENA_VISUAL_INTENTS.CARD_CLICK:
      handlers.selectCard?.(intent.payload?.instanceId || null);
      return true;
    case ARENA_VISUAL_INTENTS.CORE_CLICK:
      handlers.coreClick?.(intent.payload?.source || null);
      return true;
    case ARENA_VISUAL_INTENTS.MOVE_CORE:
      handlers.moveCore?.(intent.payload?.source || null, intent.payload?.target || null);
      return true;
    case ARENA_VISUAL_INTENTS.UTILITY_ACTION:
      handlers.utilityAction?.(intent.payload?.action || null);
      return true;
    case ARENA_VISUAL_INTENTS.PLAY_HAND_CARD:
      handlers.playHandCard?.(intent.payload?.instanceId || null);
      return true;
    case ARENA_VISUAL_INTENTS.SET_BURST_CARD:
      handlers.setBurstCard?.(intent.payload?.instanceId || null);
      return true;
    case ARENA_VISUAL_INTENTS.COMBINE_BRAVE:
      handlers.combineBrave?.(
        intent.payload?.braveInstanceId || null,
        intent.payload?.hostInstanceId || null,
        intent.payload?.options || {}
      );
      return true;
    case ARENA_VISUAL_INTENTS.DECLARE_ATTACK:
      handlers.declareAttack?.(intent.payload?.instanceId || null);
      return true;
    case ARENA_VISUAL_INTENTS.DECLARE_BLOCK:
      handlers.declareBlock?.(intent.payload?.instanceId || null);
      return true;
    default:
      handlers.unknown?.(intent);
      return false;
  }
}

export default routeArenaVisualIntent;
