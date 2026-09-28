import { useEffect, useRef, useState } from "react";
import "../../../styles/arena/burstPresentationV490.css";

const REVEAL_MS = 1450;

function copyBurstState(players = {}) {
  return new Map(
    Object.entries(players || {}).map(([playerId, player]) => [playerId, player?.burst || null])
  );
}

export default function BurstPresentation({
  players = {},
  actionLog = [],
  burstOpportunity = null,
  getCardPresentation,
  language = "ptBR"
}) {
  const previousBurstsRef = useRef(copyBurstState(players));
  const previousActionSequenceRef = useRef(actionLog?.at?.(-1)?.sequence || null);
  const timerRef = useRef(null);
  const [reveal, setReveal] = useState(null);

  useEffect(() => {
    const lastAction = actionLog?.at?.(-1) || null;
    const previousSequence = previousActionSequenceRef.current;
    const previousBursts = previousBurstsRef.current;

    if (
      lastAction?.sequence &&
      previousSequence != null &&
      lastAction.sequence !== previousSequence &&
      lastAction.type === "ACTIVATE_BURST"
    ) {
      const physical = previousBursts.get(lastAction.actorId);
      const player = players?.[lastAction.actorId];
      const presentation = physical ? getCardPresentation?.(physical) : null;

      setReveal({
        id: `${lastAction.sequence}:${lastAction.actorId}`,
        playerName: player?.name || (language === "en" ? "Player" : "Jogador"),
        ...presentation
      });
    }

    previousActionSequenceRef.current = lastAction?.sequence || previousSequence;
    previousBurstsRef.current = copyBurstState(players);
  }, [players, actionLog, getCardPresentation, language]);

  useEffect(() => {
    if (!reveal || typeof window === "undefined") return undefined;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setReveal(null);
      timerRef.current = null;
    }, REVEAL_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [reveal]);

  const opportunityPlayer = burstOpportunity?.playerId ? players?.[burstOpportunity.playerId] : null;

  return (
    <>
      {burstOpportunity && opportunityPlayer && !reveal && (
        <div className="burst-opportunity-cue" role="status" aria-live="polite">
          <span>BURST</span>
          <strong>
            {language === "en"
              ? `${opportunityPlayer.name} has a Burst window`
              : `${opportunityPlayer.name} possui uma janela de Burst`}
          </strong>
          <small>{language === "en" ? "Activate or pass." : "Ative ou passe a janela."}</small>
        </div>
      )}

      {reveal && (
        <div className="burst-presentation" role="status" aria-live="assertive">
          <div className="burst-presentation-backdrop" />
          <div className="burst-presentation-card">
            <span className="burst-presentation-eyebrow">BURST ACTIVATED</span>
            {reveal.image ? <img src={reveal.image} alt="" /> : <div className="burst-presentation-placeholder" />}
            <div>
              <strong>{reveal.name || "Burst"}</strong>
              <small>{reveal.playerName}</small>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
