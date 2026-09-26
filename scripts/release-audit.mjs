import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const problems = [];

const disposableDirs = new Set([".git", "node_modules", "dist", "release", "coverage", ".cache", ".parcel-cache", ".vite", ".vite-temp", ".turbo"]);
const disposableFilePatterns = [/\.log$/i, /\.tmp$/i, /\.temp$/i, /\.bak$/i, /\.old$/i, /^\.DS_Store$/i, /^Thumbs\.db$/i];

function walk(dir, rel = "") {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (disposableDirs.has(entry.name)) {
        problems.push(`Diretório descartável no release: ${childRel}`);
        continue;
      }
      walk(full, childRel);
    } else {
      if (disposableFilePatterns.some((pattern) => pattern.test(entry.name))) problems.push(`Arquivo descartável no release: ${childRel}`);
      if (/^\.env(?:\..+)?$/i.test(entry.name) && !/\.env\.example$/i.test(entry.name)) problems.push(`Arquivo privado de ambiente no release: ${childRel}`);
    }
  }
}
walk(root);

const versionChecks = [
  ["src/config/appVersion.js", `APP_VERSION = "${pkg.version}"`],
  ["server/index.mjs", `version: "${pkg.version}"`],
  ["src/pages/Simulator.jsx", `Eternal v${pkg.version}`]
];
for (const [rel, expected] of versionChecks) {
  const source = fs.readFileSync(path.join(root, rel), "utf8");
  if (!source.includes(expected)) problems.push(`Versão fora de sincronia em ${rel}`);
}

const forbiddenPlayerCopy = [
  /SOCIAL-HUB-[0-9]/i, /Socket\.IO/i, /publicProfile\.js/i, /src\/online/i,
  /server-side/i, /RESULT-ONLY PIPELINE/i, /MATCH ISOLATION/i, /latest\.json/i,
  /update-config\.json/i, /AI Debugger/i, /Supabase/i, /SUPABASE_SERVICE_ROLE_KEY/i,
  /service[_ -]?role/i, /localhost/i, /127\.0\.0\.1/i, /SHA-256/i,
  /\bRLS\b/i, /\bRPC\b/i, /migration/i, /\.sql\b/i, /node_modules/i,
  /package\.json/i, /Tailscale/i, /\bnpm\b/i, /\bVite\b/i, /servidor local/i,
  /Battle Spirits Server/i
];

function sourceLiterals(source) {
  source = source.replace(/import[\s\S]*?from\s+["'][^"']+["'];/g, "");
  source = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");
  return [...source.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)].map((m) => m[2]).join("\n");
}

const playerRoots = [path.join(root, "src", "pages"), path.join(root, "src", "components")];
function scanPlayerDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scanPlayerDir(full);
    else if (/\.(?:jsx?|tsx?)$/i.test(entry.name)) {
      const visible = sourceLiterals(fs.readFileSync(full, "utf8"));
      const hit = forbiddenPlayerCopy.find((pattern) => pattern.test(visible));
      if (hit) problems.push(`Informação técnica possivelmente exposta em ${path.relative(root, full)}: ${hit}`);
    }
  }
}
for (const dir of playerRoots) if (fs.existsSync(dir)) scanPlayerDir(dir);

const rawPlayerErrorPatterns = [
  /\b(?:error|err|exception|connectionError)\?*\.message\b/,
  /String\(\s*(?:error|err|exception|connectionError)\s*\)/,
  /<pre[^>]*>\s*\{[^}]*error/i
];
function scanRawPlayerErrors(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scanRawPlayerErrors(full);
    else if (/\.(?:jsx?|tsx?)$/i.test(entry.name)) {
      const source = fs.readFileSync(full, "utf8");
      if (rawPlayerErrorPatterns.some((pattern) => pattern.test(source))) {
        problems.push(`Erro técnico bruto pode chegar ao jogador em ${path.relative(root, full)}`);
      }
    }
  }
}
for (const dir of playerRoots) if (fs.existsSync(dir)) scanRawPlayerErrors(dir);

if (fs.existsSync(path.join(root, "src/pages/ServerConsole.jsx"))) {
  problems.push("Tela antiga ServerConsole.jsx não deve fazer parte do frontend de release.");
}

const serverSource = fs.readFileSync(path.join(root, "server", "index.mjs"), "utf8");
const exposedErrors = [...serverSource.matchAll(/error\s*:\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]).join("\n");
const serverHit = forbiddenPlayerCopy.find((pattern) => pattern.test(exposedErrors));
if (serverHit) problems.push(`Erro técnico do Online pode chegar ao jogador: ${serverHit}`);

function scanSecrets(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if ([".git", "public"].includes(entry.name)) continue;
      scanSecrets(full);
    } else if (/\.(?:js|jsx|mjs|cjs|json|md|txt|example|yml|yaml)$/i.test(entry.name)) {
      if (entry.name === ".env.example") continue;
      const text = fs.readFileSync(full, "utf8");
      if (/SUPABASE_SERVICE_ROLE_KEY\s*=\s*eyJ[A-Za-z0-9_-]{20,}/.test(text)) problems.push(`Possível chave privada em ${path.relative(root, full)}`);
      if (/\bsk-[A-Za-z0-9_-]{20,}\b/.test(text)) problems.push(`Possível segredo em ${path.relative(root, full)}`);
    }
  }
}
scanSecrets(root);

if (problems.length) {
  console.error("RELEASE AUDIT FAILED");
  for (const issue of problems) console.error(`- ${issue}`);
  process.exit(1);
}
console.log(`RELEASE AUDIT OK — v${pkg.version}`);
