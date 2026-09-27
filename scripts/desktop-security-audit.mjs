import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const main = fs.readFileSync(path.join(root, "electron", "main.cjs"), "utf8");
const problems = [];
const afterPack = fs.readFileSync(path.join(root, "scripts", "after-pack.cjs"), "utf8");
if (/copyFileSync\(source,\s*path\.join\(context\.appOutDir/.test(afterPack)) {
  problems.push("Build Desktop não pode clonar o executável principal como Server.exe/Updater.exe.");
}
for (const exposedExe of ["Battle Spirits Server.exe", "Battle Spirits Updater.exe", "Battle Spirits KAIHOU Server.exe", "Battle Spirits KAIHOU Updater.exe"]) {
  if (afterPack.includes(`fs.copyFileSync(source, path.join(context.appOutDir, targetName))`) && afterPack.includes(exposedExe)) {
    problems.push(`Executável auxiliar exposto no pacote: ${exposedExe}`);
  }
}


if (pkg.build?.asar !== true) problems.push("electron-builder precisa manter asar=true.");
if ((pkg.build?.asarUnpack || []).length) problems.push("asarUnpack deve permanecer vazio para código/assets/config do cliente.");
const packedFiles = JSON.stringify(pkg.build?.files || []);
for (const forbidden of ["server/**/*", "src/**/*", "electron/**/*", ".env"]) {
  if (packedFiles.includes(forbidden)) problems.push(`Fonte legível não deve ser empacotada: ${forbidden}`);
}
if (pkg.build?.extraResources?.length) problems.push("Configuração do cliente não deve sair do app.asar via extraResources.");
if (pkg.build?.extraMetadata?.main !== "desktop-dist/main.cjs") problems.push("Build empacotada deve iniciar pelo bundle minificado desktop-dist/main.cjs.");
if (!/devTools:\s*!IS_PRODUCTION/.test(main)) problems.push("DevTools não estão explicitamente desativados em produção.");
if (!/before-input-event/.test(main) || !/f12/i.test(main)) problems.push("Atalhos de DevTools não estão bloqueados.");
if (!/contextIsolation:\s*true/.test(main) || !/nodeIntegration:\s*false/.test(main) || !/sandbox:\s*true/.test(main)) {
  problems.push("BrowserWindow deve manter contextIsolation, nodeIntegration=false e sandbox=true.");
}

if (problems.length) {
  console.error("DESKTOP SECURITY AUDIT FAILED");
  for (const p of problems) console.error(`- ${p}`);
  process.exit(1);
}
console.log(`DESKTOP SECURITY AUDIT OK — v${pkg.version} (ASAR + production hardening + source exclusion)`);
