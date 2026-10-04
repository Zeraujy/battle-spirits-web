import ArenaOverlayLayer from "../../../arena/components/ArenaOverlayLayer.jsx";
import BattleExperienceLayer, { classifyBattleLogEntry } from "../../../arena/components/BattleExperienceLayer.jsx";
import BattleLinkOverlay from "../../../arena/components/BattleLinkOverlay.jsx";
import BurstPresentation from "../../../arena/components/BurstPresentation.jsx";
import GameEventToast from "../../../arena/components/GameEventToast.jsx";
import TargetingUX from "../../../arena/components/TargetingUX.jsx";

export default function ArenaVisualFeedbackLayer({
  match,
  actorId,
  canControlActor,
  language = "en",
  getCardPresentation,
  effectDecision
}) {
  if (!match) return null;

  const targetableCount = Array.isArray(effectDecision?.candidates) ? effectDecision.candidates.length : 0;

  return (
    <ArenaOverlayLayer className="arena-visual-feedback-layer">
      <BattleExperienceLayer
        match={match}
        actorId={actorId}
        canControlActor={canControlActor}
        language={language}
        showEventCue={false}
        showActionCue={false}
      />

      <BattleLinkOverlay
        attackerInstanceId={match.battle?.attackerInstanceId || null}
        blockerInstanceId={match.battle?.blockerInstanceId || null}
        defenderPlayerId={match.battle?.defenderPlayerId || null}
        theme="neutral"
        stage={match.battle?.stage || null}
      />

      <BurstPresentation
        players={match.players}
        actionLog={match.actionLog || []}
        burstOpportunity={null}
        language={language}
        getCardPresentation={getCardPresentation}
      />

      <GameEventToast
        entries={match.log || []}
        classifyEntry={classifyBattleLogEntry}
        language={language}
      />

      <TargetingUX
        active={Boolean(effectDecision && targetableCount)}
        mode={effectDecision?.kind || "effect"}
        label={effectDecision?.instruction || effectDecision?.title || (language === "en" ? "Choose a valid target" : "Escolha um alvo válido")}
        targetableCount={targetableCount}
        selectedCount={0}
        className="arena-visual-targeting-feedback"
      />
    </ArenaOverlayLayer>
  );
}
