import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/config/online.js",
  "public/config/online-config.js",
  "src/styles/base/v3.css",
  "src/styles/arena/simulatorPanels.css",
  "src/styles/arena/arenaVisuals.css",
  "src/styles/arena/effectDecision.css",
  "src/styles/arena/braveUltimate.css",
  "src/styles/arena/gameResult.css",
  "src/styles/arena/arenaLayoutV321.css",
  "src/game/legalActions.js",
  "src/game/aiEffectSemantics.js",
  "src/game/stateValidation.js",
  "src/game/snapshots.js",
  "src/components/cards/CardDetailsModal.jsx",
  "src/components/home/HomeWallpaperSlideshow.jsx",
  "scripts/windows/CONFIGURAR-ONLINE.bat",
  "scripts/windows/INICIAR-ONLINE.bat",
  "scripts/windows/TESTAR-ONLINE.bat",
  "scripts/windows/MIGRAR-CONTEUDO-DO-V2.bat"
];
const missing = required.filter((item) => !fs.existsSync(path.join(root, item)));
if (missing.length) {
  console.error("Arquivos obrigatórios ausentes:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.version !== "3.3.1") throw new Error(`package.json está em ${pkg.version}, esperado 3.3.1`);
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
if (!index.includes("./config/online-config.js")) throw new Error("index.html não carrega a configuração Online em runtime.");
const serverEnv = fs.readFileSync(path.join(root, "server", ".env.example"), "utf8");
if (!/HOST=0\.0\.0\.0/.test(serverEnv)) throw new Error("server/.env.example precisa usar HOST=0.0.0.0");
console.log(`Battle Spirits Eternal Simulator v${pkg.version}`);
console.log(`Estrutura v3 OK (${required.length} arquivos essenciais verificados).`);
