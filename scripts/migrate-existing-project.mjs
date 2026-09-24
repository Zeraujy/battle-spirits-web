import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const newRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const oldRoot = path.resolve(process.argv[2] || "");
if (!process.argv[2] || !fs.existsSync(oldRoot)) {
  console.error("Uso: node scripts/migrate-existing-project.mjs C:\\caminho\\do\\simulador-antigo");
  process.exit(1);
}

function copy(relative) {
  const source = path.join(oldRoot, relative);
  const dest = path.join(newRoot, relative);
  if (!fs.existsSync(source)) {
    console.warn(`Não encontrado no projeto antigo: ${relative}`);
    return;
  }
  fs.cpSync(source, dest, { recursive: true, force: true });
  console.log(`Copiado: ${relative}`);
}

copy("src/data");
copy("public/cards-database");
for (const name of ["logo_battlespirits.png", "card-back.png"]) {
  const source = path.join(oldRoot, "public", "images", name);
  const dest = path.join(newRoot, "public", "images", name);
  if (fs.existsSync(source)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(source, dest);
    console.log(`Copiado: public/images/${name}`);
  } else {
    console.warn(`Não encontrado: public/images/${name}`);
  }
}
console.log("Migração concluída. Rode: npm run verify");
