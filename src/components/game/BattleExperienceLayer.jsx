import { useEffect, useMemo, useRef, useState } from "react";

const PHASE_LABELS = {
  start: { ptBR: "START STEP", en: "START STEP" },
  core: { ptBR: "CORE STEP", en: "CORE STEP" },
  draw: { ptBR: "DRAW STEP", en: "DRAW STEP" },
  refresh: { ptBR: "REFRESH STEP", en: "REFRESH STEP" },
  main: { ptBR: "MAIN STEP", en: "MAIN STEP" },
  attack: { ptBR: "ATTACK STEP", en: "ATTACK STEP" },
  end: { ptBR: "END STEP", en: "END STEP" }
};

export function classifyBattleLogEntry(entry) {
  const text = String(entry?.text || "").toLowerCase();
  if (/attack|ataca|blocked|block|bloque/.test(text)) return "battle";
  if (/flash|burst/.test(text)) return "timing";
  if (/life|vida|damage|dano/.test(text)) return "life";
  if (/core|soul/.test(text)) return "core";
  if (/destroy|destr|trash|lixo/.test(text)) return "removal";
  if (/summon|invoc|deploy|nexus|magic|brave/.test(text)) return "play";
  return "system";
}

export default function BattleExperienceLayer({ match, actorId, canControlActor, language = "ptBR" }) {
  const [phaseCue, setPhaseCue] = useState(null);
  const [eventCue, setEventCue] = useState(null);
  const previousPhaseRef = useRef(null);
  const previousLogIdRef = useRef(null);

  useEffect(() => {
    const phase = match?.phase;
    if (!phase) return undefined;
    const changed = previousPhaseRef.current && previousPhaseRef.current !== phase;
    previousPhaseRef.current = phase;
    if (!changed) return undefined;

    const label = PHASE_LABELS[phase]?.[language] || PHASE_LABELS[phase]?.en || String(phase).toUpperCase();
    setPhaseCue({ phase, label, turn: Number(match?.turnNumber || 0) });
    const timer = window.setTimeout(() => setPhaseCue(null), 1150);
    return () => window.clearTimeout(timer);
  }, [match?.phase, match?.turnNumber, language]);

  useEffect(() => {
    const last = Array.isArray(match?.log) ? match.log.at(-1) : null;
    if (!last?.id) return undefined;
    if (previousLogIdRef.current == null) {
      previousLogIdRef.current = last.id;
      return undefined;
    }
    if (previousLogIdRef.current === last.id) return undefined;
    previousLogIdRef.current = last.id;

    const text = String(last.text || "").trim();
    if (!text) return undefined;
    setEventCue({ id: last.id, text, kind: classifyBattleLogEntry(last) });
    const timer = window.setTimeout(() => setEventCue(null), 1700);
    return () => window.clearTimeout(timer);
  }, [match?.log]);

  const actionCue = useMemo(() => {
    const battle = match?.battle;
    const actorName = match?.players?.[actorId]?.name || (language === "en" ? "Player" : "Jogador");

    if (battle?.flash?.priorityPlayerId) {
      return {
        kind: "flash",
        eyebrow: `FLASH TIMING ${battle.flash.number || ""}`.trim(),
        title: canControlActor
          ? (language === "en" ? "Your priority" : "Sua prioridade")
          : (language === "en" ? `${actorName} has priority` : `Prioridade de ${actorName}`),
        detail: language === "en" ? "Use a Flash effect or pass priority." : "Use um efeito Flash ou passe a prioridade."
      };
    }

    if (battle?.stage === "block") {
      return {
        kind: "block",
        eyebrow: language === "en" ? "BLOCK WINDOW" : "JANELA DE BLOQUEIO",
        title: canControlActor
          ? (language === "en" ? "Choose a blocker" : "Escolha um bloqueador")
          : (language === "en" ? `${actorName} is choosing a blocker` : `${actorName} está escolhendo um bloqueador`),
        detail: language === "en" ? "Highlighted cards can legally block." : "As cartas destacadas podem bloquear legalmente."
      };
    }

    if (battle?.attackerInstanceId && battle?.stage) {
      return {
        kind: "attack",
        eyebrow: language === "en" ? "BATTLE IN PROGRESS" : "BATALHA EM ANDAMENTO",
        title: language === "en" ? "Attack declared" : "Ataque declarado",
        detail: language === "en" ? "Battle timing is active." : "O timing de batalha está ativo."
      };
    }

    return null;
  }, [match?.battle, match?.players, actorId, canControlActor, language]);

  return (
    <>
      {phaseCue && (
        <div className={`battle-exp-phase-cue phase-${phaseCue.phase}`} aria-live="polite">
          <span>{language === "en" ? `TURN ${phaseCue.turn}` : `TURNO ${phaseCue.turn}`}</span>
          <strong>{phaseCue.label}</strong>
          <i aria-hidden="true" />
        </div>
      )}

      {actionCue && (
        <div className={`battle-exp-action-cue cue-${actionCue.kind}`} role="status">
          <span>{actionCue.eyebrow}</span>
          <strong>{actionCue.title}</strong>
          <small>{actionCue.detail}</small>
        </div>
      )}

      {eventCue && (
        <div className={`battle-exp-event-cue event-${eventCue.kind}`} aria-live="polite">
          <i aria-hidden="true" />
          <span>{eventCue.text}</span>
        </div>
      )}
    </>
  );
}
