import { createEffectResolutionPresentation } from "../../models/effectResolutionPresentation.js";
import BurstRevealOverlay from "./BurstRevealOverlay.jsx";
import ChoicePrompt from "./ChoicePrompt.jsx";
import EffectResolutionPanel from "./EffectResolutionPanel.jsx";
import FlashWindow from "./FlashWindow.jsx";
import TargetSelectionPrompt from "./TargetSelectionPrompt.jsx";

export default function ArenaEffectResolutionLayer({ viewModel, presentationData, onActionRequest }) {
  const model = createEffectResolutionPresentation(viewModel, presentationData);

  return (
    <div className="arena-redesign-effect-layer" aria-label="Effect Resolution Layer">
      <BurstRevealOverlay burst={model.burst} onActionRequest={onActionRequest} />
      <FlashWindow flash={model.flash} onActionRequest={onActionRequest} />
      <EffectResolutionPanel effect={model.effect} />
      <TargetSelectionPrompt targetSelection={model.targetSelection} />
      <ChoicePrompt choice={model.choice} onActionRequest={onActionRequest} />
    </div>
  );
}
