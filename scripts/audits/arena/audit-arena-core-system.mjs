import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const required=[
 "src/features/arena-redesign/components/resources/CoreToken.jsx",
 "src/features/arena-redesign/components/resources/CorePool.jsx",
 "src/features/arena-redesign/components/resources/CoreResourceZone.jsx",
 "src/features/arena-redesign/interactions/coreInteraction.js"
];
for (const rel of required) if(!fs.existsSync(path.join(root,rel))) throw new Error(`Core QA failed: missing ${rel}`);
const token=fs.readFileSync(path.join(root,required[0]),"utf8");
for (const marker of ["core", "soul"]) if(!token.toLowerCase().includes(marker)) throw new Error(`Core QA failed: missing ${marker} token support.`);
const interaction=fs.readFileSync(path.join(root,required[3]),"utf8");
for (const forbidden of ["applyGameAction","resolveEffect","server/","src/game"]) if(interaction.includes(forbidden)) throw new Error(`Core QA failed: presentation interaction crossed authority boundary (${forbidden}).`);
console.log("Arena Release QA — Core System: PASS");
