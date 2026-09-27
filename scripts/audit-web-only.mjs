import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const ignoredDirs = new Set([".git", "node_modules", "dist", ".wrangler"]);
const forbiddenExtensions = new Set([".bat", ".cmd", ".ps1", ".exe", ".msi", ".dmg", ".appimage", ".icns"]);
const forbiddenNames = [
  /electron/i,
  /desktop[-_ ]?(?:client|app|build|release|installer|updater)/i,
  /(?:installer|updater)[-_ ]?desktop/i,
  /preload\.c?js$/i,
];
const forbiddenSourceTokens = [
  /\belectron\b/i,
  /\belectron-builder\b/i,
  /\bBrowserWindow\b/,
  /\bipcRenderer\b/,
  /\bipcMain\b/,
  /\bautoUpdater\b/,
  /\bNSIS\b/,
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replaceAll(path.sep, "/");
    if (entry.isDirectory()) {
      if (forbiddenNames.some((pattern) => pattern.test(entry.name))) problems.push(`Diretório nativo obsoleto: ${rel}`);
      walk(full);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (forbiddenExtensions.has(ext)) problems.push(`Arquivo específico de sistema operacional: ${rel}`);
    if (forbiddenNames.some((pattern) => pattern.test(entry.name))) problems.push(`Artefato nativo obsoleto: ${rel}`);

    if (/\.(?:js|jsx|mjs|cjs|ts|tsx|json|md|txt|css|html|sql)$/i.test(entry.name) && !["package-lock.json", "scripts/audit-web-only.mjs"].includes(rel)) {
      const source = fs.readFileSync(full, "utf8");
      const token = forbiddenSourceTokens.find((pattern) => pattern.test(source));
      if (token) problems.push(`Referência ao antigo cliente nativo em ${rel}: ${token}`);
    }
  }
}

walk(root);

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const direct = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}), ...(pkg.optionalDependencies || {}) };
for (const name of Object.keys(direct)) {
  if (/electron|electron-builder/i.test(name)) problems.push(`Dependência nativa direta proibida: ${name}`);
}

if (problems.length) {
  console.error("WEB-ONLY AUDIT FAILED");
  for (const problem of [...new Set(problems)]) console.error(`- ${problem}`);
  process.exit(1);
}

console.log("WEB-ONLY AUDIT OK — nenhuma dependência ou artefato do antigo cliente nativo encontrado.");
