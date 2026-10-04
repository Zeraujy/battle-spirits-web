import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const mustExist = [
  "src/features/arena-redesign/ArenaRedesign.jsx",
  "src/features/arena-redesign/components/ArenaRedesignShell.jsx",
  "src/features/arena-redesign/components/ArenaRedesignSurface.jsx",
  "src/features/arena-redesign/components/layout/ArenaSideLayout.jsx",
  "src/features/arena-redesign/styles/arena-redesign.css"
];
for (const rel of mustExist) if (!fs.existsSync(path.join(root, rel))) throw new Error(`Arena layout QA failed: missing ${rel}`);
const shell = fs.readFileSync(path.join(root, mustExist[1]), "utf8");
const marker = shell.match(/data-arena-redesign-foundation=\"(\d+)\"/);
if (!marker || Number(marker[1]) < 15) throw new Error("Arena layout QA failed: Phase 15 release marker missing.");
const css = fs.readFileSync(path.join(root, mustExist[4]), "utf8");
for (const token of ["arena-redesign-shell", "arena-redesign-side-opponent", "arena-redesign-side-player", "arena-redesign-utility-panel"]) {
  if (!css.includes(token)) throw new Error(`Arena layout QA failed: missing layout token ${token}`);
}
console.log("Arena Release QA — Layout: PASS");
