import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const code = String(process.argv[2] || "").trim().toUpperCase();
if (!code || !/^[A-Z0-9-]+$/.test(code)) {
  console.error("Uso: npm run cards:template -- BSXX");
  process.exit(1);
}
const out = path.join(root, "card-imports", code);
const imageDir = path.join(out, "images");
fs.mkdirSync(imageDir, { recursive: true });
const template = {
  set: { code, nameEN: "", namePT: "", releaseDate: "" },
  cards: [
    {
      id: `${code}-001`, set: code, nameEN: "Card Name", namePT: "Nome da Carta",
      cardType: "spirit", colors: ["red"], cost: 3, reduction: ["red"], rarity: "C",
      families: [], symbols: ["red"],
      levels: [{ level: 1, cores: 1, bp: 3000 }],
      effectText: { en: "", ptBR: "" }, effects: [], abilities: [],
      image: `/cards-database/${code}/${code}-001.webp`
    }
  ]
};
fs.writeFileSync(path.join(out, "cards.json"), `${JSON.stringify(template, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(out, "README.txt"), `1. Edite cards.json\n2. Coloque as imagens em images/ usando de preferência o ID da carta como nome.\n3. Execute: npm run cards:import -- --json card-imports/${code}/cards.json --images card-imports/${code}/images --set ${code}\n`, "utf8");
console.log(`Template criado em ${path.relative(root, out)}`);
