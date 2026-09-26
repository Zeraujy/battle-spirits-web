import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];

const playerDirs = [path.join(root, "src", "pages"), path.join(root, "src", "components")];
const technicalCopy = [
  /localhost/i, /127\.0\.0\.1/i, /SUPABASE_SERVICE_ROLE_KEY/i, /service[_ -]?role/i,
  /Socket\.IO/i, /publicProfile\.js/i, /node_modules/i, /package\.json/i,
  /latest\.json/i, /update-config\.json/i, /\.sql\b/i, /\bRLS\b/i, /\bRPC\b/i,
  /Tailscale/i, /\bnpm\b/i, /\bVite\b/i
];
const rawErrorPatterns = [
  /\b(?:error|err|exception|connectionError)\?*\.message\b/,
  /String\(\s*(?:error|err|exception|connectionError)\s*\)/,
  /<pre[^>]*>\s*\{[^}]*error/i
];

function stringLiterals(source) {
  const withoutComments = source
    .replace(/import[\s\S]*?from\s+["'][^"']+["'];/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "");
  return [...withoutComments.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)]
    .map((match) => match[2])
    .join("\n");
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:jsx?|tsx?)$/i.test(entry.name)) {
      const source = fs.readFileSync(full, "utf8");
      const rel = path.relative(root, full);
      const visible = stringLiterals(source);
      const technical = technicalCopy.find((pattern) => pattern.test(visible));
      if (technical) problems.push(`Texto técnico possivelmente visível em ${rel}: ${technical}`);
      const rawError = rawErrorPatterns.find((pattern) => pattern.test(source));
      if (rawError) problems.push(`Erro técnico bruto pode chegar à interface em ${rel}`);
    }
  }
}
for (const dir of playerDirs) walk(dir);

if (fs.existsSync(path.join(root, "src/pages/ServerConsole.jsx"))) {
  problems.push("Tela antiga ServerConsole.jsx ainda existe no frontend.");
}

const responsiveChecks = [
  ["src/styles/pages/profile.css", /@media\s*\(max-width:\s*520px\)/, /overflow-x:\s*hidden/],
  ["src/styles/pages/account.css", /@media\s*\(max-width:\s*520px\)/, /overflow-x:\s*hidden/],
  ["src/styles/pages/onlineLobbySafe.css", /@media\s*\(max-width:\s*520px\)/, /overflow-x:\s*hidden/],
  ["src/styles/pages/localSetup.css", /@media\s*\(max-width:\s*680px\)/, /overflow-x:\s*hidden/],
  ["src/styles/pages/settingsGame.css", /@media\s*\(max-width:\s*520px\)/, /overflow-x:\s*hidden/],
  ["src/styles/pages/tutorialV395.css", /@media\s*\(max-width:640px\)/, /overflow-x:\s*hidden/],
  ["src/styles/deckbuilder/deckBuilderV398.css", /@media\s*\(max-width:\s*620px\)/, /deck-builder-v3-grid/]
];
for (const [rel, mobilePattern, overflowPattern] of responsiveChecks) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    problems.push(`CSS essencial ausente: ${rel}`);
    continue;
  }
  const css = fs.readFileSync(full, "utf8");
  if (!mobilePattern.test(css)) problems.push(`Breakpoint compacto ausente em ${rel}`);
  if (!overflowPattern.test(css)) problems.push(`Proteção contra overflow horizontal ausente em ${rel}`);
}

if (problems.length) {
  console.error("UI AUDIT FAILED");
  for (const issue of problems) console.error(`- ${issue}`);
  process.exit(1);
}
console.log("UI AUDIT OK — frontend limpo e responsivo nos fluxos principais.");
