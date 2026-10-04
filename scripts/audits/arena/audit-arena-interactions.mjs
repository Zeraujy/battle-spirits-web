import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const required=[
 "src/features/arena-redesign/components/battle/BattleFocus.jsx",
 "src/features/arena-redesign/components/battle/AttackConnector.jsx",
 "src/features/arena-redesign/components/battle/TargetingLayer.jsx",
 "src/features/arena-redesign/components/effects/ArenaEffectResolutionLayer.jsx",
 "src/features/arena-redesign/components/utility/ArenaUtilityPanel.jsx",
 "src/features/arena-redesign/interactions/handInteraction.js",
 "src/features/arena-redesign/interactions/coreInteraction.js",
 "src/features/arena-redesign/ArenaRedesign.jsx",
 "src/features/arena-redesign/components/zones/BattlefieldZone.jsx",
 "src/features/arena-redesign/components/hand/ArenaHandCard.jsx"
];
for(const rel of required) if(!fs.existsSync(path.join(root,rel))) throw new Error(`Interaction QA failed: missing ${rel}`);
const joined=required.map(rel=>fs.readFileSync(path.join(root,rel),"utf8")).join("\n");
for(const forbidden of ["applyGameAction(","resolveEffect(","dispatchGameAction("]) if(joined.includes(forbidden)) throw new Error(`Interaction QA failed: UI performs authority action ${forbidden}`);
for(const bridge of ["onHandCardDrop","onEffectActionRequest","onUtilityActionRequest"]) if(!joined.includes(bridge)) throw new Error(`Interaction QA failed: missing controller bridge ${bridge}`);
console.log("Arena Release QA — Interactions: PASS");
