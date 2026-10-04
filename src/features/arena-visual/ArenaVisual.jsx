import { useEffect, useMemo, useRef, useState } from "react";
import "./styles/arenaVisualTokens.css";
import "./styles/arenaVisual.css";
import ArenaVisualShell from "./components/ArenaVisualShell.jsx";
import ArenaVisualLayout from "./layout/ArenaVisualLayout.jsx";
import ArenaVisualHoverPreview from "./components/ArenaVisualHoverPreview.jsx";
import ArenaVisualMatchResult from "./components/result/ArenaVisualMatchResult.jsx";
import ArenaVisualStatusLayer from "./components/status/ArenaVisualStatusLayer.jsx";
import ArenaVisualFeedbackLayer from "./components/feedback/ArenaVisualFeedbackLayer.jsx";
import CardMotionLayer from "../arena/components/CardMotionLayer.jsx";
import { createArenaVisualLayoutModel } from "./models/arenaVisualLayoutModel.js";
import { createArenaInteractionBus } from "./interactions/arenaInteractionBus.js";
import { selectCardIntent } from "./interactions/arenaIntentFactory.js";

export default function ArenaVisual({
  viewModel = {},
  playmatId,
  onUtilityActionRequest,
  interactionController = null,
  motionPlayers = null,
  matchResult = null,
  matchResultActions = {},
  feedbackMatch = null,
  feedbackActorId = null,
  feedbackCanControlActor = false,
  feedbackLanguage = "en",
  getFeedbackCardPresentation = null
}) {
  const model = createArenaVisualLayoutModel({
    ...viewModel,
    playmatId: playmatId || viewModel?.playmatId
  });
  const [selectedCard, setSelectedCard] = useState(null);
  const [hoverPreview, setHoverPreview] = useState(null);
  const hoverTimerRef = useRef(null);
  const bus = useMemo(
    () => createArenaInteractionBus({ requestIntent: interactionController?.requestIntent }),
    [interactionController?.requestIntent]
  );
  const interaction = {
    enabled: Boolean(model.interaction?.canControlActor && interactionController?.requestIntent),
    canMoveCores: Boolean(model.interaction?.canMoveCores && interactionController?.requestIntent),
    playerId: model.interaction?.viewerPlayerId || null,
    opponentPlayerId: model.interaction?.opponentPlayerId || null,
    battleAttackerInstanceId: model.utility?.battle?.attackerInstanceId || null,
    requestIntent: bus.emit
  };


  useEffect(() => () => {
    window.clearTimeout(hoverTimerRef.current);
  }, []);

  function beginHoverCard(card, event) {
    if (!card || card.hidden) return;
    window.clearTimeout(hoverTimerRef.current);
    const point = { x: event?.clientX || 0, y: event?.clientY || 0 };
    hoverTimerRef.current = window.setTimeout(() => {
      setHoverPreview({ card, ...point });
    }, 260);
  }

  function moveHoverCard(event) {
    if (!hoverPreview) return;
    setHoverPreview((current) => current ? { ...current, x: event.clientX, y: event.clientY } : current);
  }

  function endHoverCard() {
    window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
    setHoverPreview(null);
  }

  function selectCard(card) {
    setSelectedCard(card);
    if (card?.instanceId) {
      bus.emit(selectCardIntent(card.instanceId, { input: "pointer" }));
    }
  }

  return (
    <ArenaVisualShell playmatId={model.playmatId}>
      {motionPlayers ? <CardMotionLayer players={motionPlayers} enabled /> : null}
      <ArenaVisualStatusLayer authority={model.utility?.authority} online={model.utility?.online} />
      <ArenaVisualLayout
        model={model}
        selectedCard={selectedCard}
        onSelectCard={selectCard}
        onUtilityActionRequest={onUtilityActionRequest}
        interaction={interaction}
        hoverCardHandlers={{ begin: beginHoverCard, move: moveHoverCard, end: endHoverCard }}
      />
      <ArenaVisualHoverPreview preview={hoverPreview} />
      <ArenaVisualFeedbackLayer
        match={feedbackMatch}
        actorId={feedbackActorId}
        canControlActor={feedbackCanControlActor}
        language={feedbackLanguage}
        getCardPresentation={getFeedbackCardPresentation}
        effectDecision={model.utility?.effectDecision}
      />
      <ArenaVisualMatchResult
        result={matchResult}
        onRequestRematch={matchResultActions.onRequestRematch}
        onPlayAgain={matchResultActions.onPlayAgain}
        onAddOpponent={matchResultActions.onAddOpponent}
        onOpenProfile={matchResultActions.onOpenProfile}
        onExit={matchResultActions.onExit}
      />
    </ArenaVisualShell>
  );
}
