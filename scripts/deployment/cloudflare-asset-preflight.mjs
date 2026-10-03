import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "dist");
const limit = 25 * 1024 * 1024;
if (!fs.existsSync(root)) throw new Error("dist/ não existe. Execute npm run build antes.");
const oversized = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      const size = fs.statSync(full).size;
      if (size > limit) oversized.push({ file: path.relative(root, full), size });
    }
  }
};
walk(root);
if (oversized.length) {
  console.error("Cloudflare asset preflight falhou:");
  for (const item of oversized) console.error(`- ${item.file}: ${(item.size / 1024 / 1024).toFixed(1)} MiB (limite 25 MiB)`);
  process.exit(1);
}
console.log("Cloudflare asset preflight OK — nenhum asset acima de 25 MiB.");
