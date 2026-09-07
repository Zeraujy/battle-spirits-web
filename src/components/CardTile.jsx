import { resolveCardImage, getCardName } from "../game/cardAdapter.js";
import { getCurrentLevel } from "../game/selectors.js";
import { CoreToken } from "./CoreArea.jsx";

export default function CardTile({ card, physical, hidden = false, selected = false, onClick, compact = false, footer, draggable=false, onDragStart, onCoreDrop, onCoreDragStart, canDragCores=false, onPreviewStart, onPreviewEnd, staticPreview=false, unusable=false }) {
  const level = physical && card ? getCurrentLevel(card, physical) : null;
  const regular = Number(physical?.cores?.regular || 0);
  return (
    <button type="button" className={`card-tile ${compact ? "compact" : ""} ${selected ? "selected" : ""} ${physical?.exhausted && !staticPreview ? "exhausted" : ""} ${physical?.flags?.pendingManualPlay ? "pending-play-card" : ""} ${unusable ? "unusable" : ""}`} onClick={onClick} title={hidden ? "Carta oculta" : getCardName(card)} draggable={draggable} onDragStart={onDragStart}
      onDragOver={onCoreDrop ? (e)=>{ if (e.dataTransfer.types.includes("application/x-bs-core")) e.preventDefault(); } : undefined} onDrop={onCoreDrop}
      onMouseEnter={!hidden && card ? ()=>onPreviewStart?.(card) : undefined} onMouseLeave={!hidden && card ? ()=>onPreviewEnd?.() : undefined}>
      <img src={hidden ? "./images/card-back.png" : resolveCardImage(card)} alt={hidden ? "Card back" : getCardName(card)} draggable="false" />
      {!hidden && physical && <><div className="card-badges"><span>{regular + (physical.cores?.soul ? 1 : 0)}C</span>{physical.cores?.soul && <span className="soul">S</span>}{level && <span>Lv{level.level}</span>}{physical.temporaryBP ? <span>{physical.temporaryBP > 0 ? "+" : ""}{physical.temporaryBP} BP</span> : null}</div><div className="card-core-tokens">{Array.from({length:Math.min(regular, 8)},(_,i)=><CoreToken key={i} coreType="regular" canDrag={canDragCores} source={{ zone:"card", instanceId:physical.instanceId, tokenIndex:i }} onDragStart={onCoreDragStart} style={{ left:`${20 + (i%4)*17}%`, top:`${67 + Math.floor(i/4)*10}%` }} />)}{physical.cores?.soul && <CoreToken coreType="soul" canDrag={canDragCores} source={{ zone:"card", instanceId:physical.instanceId, tokenIndex:"soul" }} onDragStart={onCoreDragStart} style={{ left:"72%", top:"70%" }} />}</div></>}
      {physical?.combinedWith && <span className="combined-tag">BRAVE</span>}{footer}
    </button>
  );
}
