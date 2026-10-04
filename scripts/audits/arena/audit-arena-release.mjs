import { spawnSync } from "node:child_process";
const audits=[
 "audit-arena-layout.mjs","audit-arena-zones.mjs","audit-arena-card-visibility.mjs","audit-arena-core-system.mjs","audit-arena-interactions.mjs","audit-arena-playmats.mjs","audit-arena-responsive.mjs",
 "audit-arena-redesign-foundation.mjs","audit-arena-redesign-layout-resources.mjs","audit-arena-redesign-interaction-cards.mjs","audit-arena-redesign-hand-system.mjs","audit-arena-redesign-playability-targeting.mjs","audit-arena-redesign-battle-interaction.mjs","audit-arena-redesign-utility-panel.mjs","audit-arena-redesign-effects-ux.mjs","audit-arena-redesign-responsive-touch.mjs"
];
for(const audit of audits){
 const result=spawnSync(process.execPath,[`scripts/audits/arena/${audit}`],{stdio:"inherit"});
 if(result.status!==0) process.exit(result.status ?? 1);
}
console.log("Arena Redesign Phase 15 — Release QA aggregate: PASS");
