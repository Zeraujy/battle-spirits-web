import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const zones=["LifeZone.jsx","ReserveZone.jsx","BurstZone.jsx","TrashZone.jsx","TrashCoreZone.jsx","DeckZone.jsx","HandZone.jsx","VoidZone.jsx","BattlefieldZone.jsx"];
for (const name of zones) {
  const rel=`src/features/arena-redesign/components/zones/${name}`;
  if (!fs.existsSync(path.join(root,rel))) throw new Error(`Arena zones QA failed: missing ${rel}`);
}
const side=fs.readFileSync(path.join(root,"src/features/arena-redesign/components/layout/ArenaSideLayout.jsx"),"utf8");
for (const marker of ["LifeZone","ReserveZone","BurstZone","TrashZone","DeckZone","HandZone","BattlefieldZone"]) if (!side.includes(marker)) throw new Error(`Arena zones QA failed: ${marker} not mounted.`);
console.log("Arena Release QA — Zones: PASS");
