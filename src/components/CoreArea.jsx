import { useMemo, useState } from "react";

function seedPosition(index, salt = 0) {
  const x = 12 + ((index * 37 + salt * 19) % 70);
  const y = 18 + ((index * 53 + salt * 11) % 58);
  return { x, y };
}

export function CoreToken({ coreType="regular", source, canDrag=true, style, onDragStart, title }) {
  return <div
    className={`core-token ${coreType === "soul" ? "soul-core" : "regular-core"}`}
    draggable={canDrag}
    style={style}
    title={title || (coreType === "soul" ? "Soul Core" : "Core")}
    onDragStart={(e)=>{ e.stopPropagation(); onDragStart?.(e, { ...source, coreType }); }}
    onMouseDown={(e)=>e.stopPropagation()}
  ><span>{coreType === "soul" ? "S" : ""}</span></div>;
}

export default function CoreArea({ title, playerId, zone, regularCount=0, soul=false, canControl=false, onCoreDrop, accent="reserve" }) {
  const [positions, setPositions] = useState({});
  const tokens = useMemo(()=>Array.from({ length:Number(regularCount||0) }, (_, i)=>i), [regularCount]);

  function dragStart(e, payload) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-bs-core", JSON.stringify(payload));
    e.dataTransfer.setData("text/plain", "bs-core");
  }
  function drop(e) {
    e.preventDefault();
    let payload;
    try { payload = JSON.parse(e.dataTransfer.getData("application/x-bs-core")); } catch { return; }
    if (!payload) return;
    if (payload.playerId === playerId && payload.zone === zone && payload.tokenIndex != null) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.max(7, Math.min(91, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(10, Math.min(88, ((e.clientY - rect.top) / rect.height) * 100));
      setPositions((p)=>({ ...p, [payload.tokenIndex]:{x,y} }));
      return;
    }
    onCoreDrop?.(payload, { zone });
  }
  const soulPos = positions.soul || { x:48, y:45 };
  return <div className={`core-area ${accent}`} onDragOver={(e)=>e.preventDefault()} onDrop={drop}>
    <div className="core-area-header"><strong>{title}</strong><span>{regularCount}{soul ? " + Soul" : ""}</span></div>
    <div className="core-area-field">
      {tokens.map((index)=>{
        const pos = positions[index] || seedPosition(index, zone === "trash" ? 4 : 1);
        return <CoreToken key={`r-${index}`} coreType="regular" canDrag={canControl} source={{ playerId, zone, tokenIndex:index }} onDragStart={dragStart} style={{ left:`${pos.x}%`, top:`${pos.y}%` }} />;
      })}
      {soul && <CoreToken coreType="soul" canDrag={canControl} source={{ playerId, zone, tokenIndex:"soul" }} onDragStart={dragStart} style={{ left:`${soulPos.x}%`, top:`${soulPos.y}%` }} />}
      {!regularCount && !soul && <span className="core-area-empty">0</span>}
    </div>
  </div>;
}
