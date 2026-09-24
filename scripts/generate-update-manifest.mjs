import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const releaseDir = path.join(root, "release");
const installerName = `Battle-Spirits-Setup-${pkg.version}.exe`;
const installerPath = path.join(releaseDir, installerName);

if (!fs.existsSync(installerPath)) {
  console.warn(`Manifesto não gerado: ${installerName} não foi encontrado em release/.`);
  process.exit(0);
}

const sha256 = crypto.createHash("sha256").update(fs.readFileSync(installerPath)).digest("hex");
const baseUrl = String(process.env.UPDATE_BASE_URL || "").replace(/\/$/, "");
const manifest = {
  version: pkg.version,
  installerUrl: baseUrl ? `${baseUrl}/${installerName}` : installerName,
  sha256,
  notes: [
    "Aplicativo Windows com instalador dedicado.",
    "Battle Spirits Updater.exe para futuras atualizações.",
    "Battle Spirits Server.exe para partidas em LAN.",
    "Dados do jogador persistidos fora da pasta de instalação."
  ],
  publishedAt: new Date().toISOString()
};

fs.writeFileSync(path.join(releaseDir, "latest.json"), JSON.stringify(manifest, null, 2));
console.log(`OK latest.json -> versão ${pkg.version}`);
