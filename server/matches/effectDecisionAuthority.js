const DECISION_PAYLOAD_LIMIT = 128;

function payloadSize(payload) {
  try { return JSON.stringify(payload || {}).length; } catch { return Infinity; }
}

export function validateServerEffectDecisionIntent({ match, playerId, action } = {}) {
  if (action?.type !== "RESOLVE_EFFECT_DECISION") return { ok: true };
  const pending = match?.pendingEffectDecision;
  if (!pending) return { ok: false, code: "NO_PENDING_EFFECT_DECISION", error: "Não existe decisão de efeito pendente no servidor." };
  if (pending.playerId !== playerId) return { ok: false, code: "EFFECT_DECISION_OWNER_MISMATCH", error: "Esta decisão pertence ao outro jogador." };

  const decisionId = String(action?.decisionId || action?.payload?.decisionId || "");
  if (!decisionId || decisionId !== String(pending.id || "")) {
    return { ok: false, code: "STALE_EFFECT_DECISION", error: "A decisão de efeito foi atualizada. Sincronizando novamente." };
  }

  if (payloadSize(action.payload) > 32_768) {
    return { ok: false, code: "EFFECT_DECISION_PAYLOAD_TOO_LARGE", error: "A escolha enviada é grande demais." };
  }

  const ids = [
    ...(Array.isArray(action?.payload?.selectedInstanceIds) ? action.payload.selectedInstanceIds : []),
    ...(Array.isArray(action?.payload?.orderedInstanceIds) ? action.payload.orderedInstanceIds : []),
    ...(Array.isArray(action?.payload?.orderedTriggerIds) ? action.payload.orderedTriggerIds : [])
  ];
  if (ids.length > DECISION_PAYLOAD_LIMIT) {
    return { ok: false, code: "EFFECT_DECISION_PAYLOAD_TOO_LARGE", error: "A escolha contém itens demais." };
  }
  return { ok: true, decisionId };
}
