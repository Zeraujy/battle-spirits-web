import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const files=[
 "src/features/arena-redesign/components/cards/ArenaFieldCard.jsx",
 "src/features/arena-redesign/components/cards/fieldCardPresentation.js",
 "src/features/arena-redesign/components/hand/ArenaHandCard.jsx",
 "src/features/arena-redesign/styles/arena-redesign.css"
];
for (const rel of files) if (!fs.existsSync(path.join(root,rel))) throw new Error(`Card visibility QA failed: missing ${rel}`);
const card=fs.readFileSync(path.join(root,files[0]),"utf8");
for (const token of ["img", "artwork", "core", "level", "bp"]) if (!card.toLowerCase().includes(token)) throw new Error(`Card visibility QA failed: field card presentation missing ${token}.`);
const css=fs.readFileSync(path.join(root,files[3]),"utf8");
const forbidden=[/\.arena-redesign-field-card[^\{]*\{[^\}]*display\s*:\s*none/is,/\.arena-redesign-field-card[^\{]*\{[^\}]*visibility\s*:\s*hidden/is];
for (const pattern of forbidden) if (pattern.test(css)) throw new Error("Card visibility QA failed: field card can be globally hidden by CSS.");
for (const rel of ["src/features/arena-redesign/components/battle/TargetingLayer.jsx","src/features/arena-redesign/components/battle/AttackConnector.jsx"]) {
 const src=fs.readFileSync(path.join(root,rel),"utf8");
 if (/style\s*=\s*\{[^}]*zIndex\s*:\s*9999/is.test(src)) throw new Error(`Card visibility QA failed: unsafe overlay stacking in ${rel}`);
}
console.log("Arena Release QA — Card Visibility: PASS");
