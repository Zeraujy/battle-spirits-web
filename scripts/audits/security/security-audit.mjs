import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const problems = [];
const allowedPublicKeyNames = new Set(["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
const scanRoots = ["src", "server", "config", "scripts", ".github"];
const secretPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']?eyJ[A-Za-z0-9_-]{20,}/i,
  /\b(?:sk|rk|pk_live)-[A-Za-z0-9_-]{20,}\b/,
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/
];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:js|jsx|mjs|cjs|json|yml|yaml|md|txt)$/i.test(entry.name)) {
      const text = fs.readFileSync(full, "utf8");
      for (const pattern of secretPatterns) if (pattern.test(text)) problems.push(`Possível segredo privado em ${path.relative(root, full)}`);
      for (const m of text.matchAll(/\b(VITE_[A-Z0-9_]*(?:KEY|SECRET|TOKEN))\b/g)) {
        if (!allowedPublicKeyNames.has(m[1])) problems.push(`Variável sensível não permitida no cliente em ${path.relative(root, full)}: ${m[1]}`);
      }
    }
  }
}
for (const rel of scanRoots) walk(path.join(root, rel));

const envExample = path.join(root, ".env.example");
if (fs.existsSync(envExample)) {
  const text = fs.readFileSync(envExample, "utf8");
  if (/SERVICE_ROLE|PRIVATE|SECRET/i.test(text)) problems.push(".env.example raiz não deve sugerir segredo de servidor para o cliente.");
}

if (problems.length) {
  console.error("SECURITY AUDIT FAILED");
  for (const p of [...new Set(problems)]) console.error(`- ${p}`);
  process.exit(1);
}
console.log("SECURITY AUDIT OK — cliente contém somente configuração pública permitida.");
