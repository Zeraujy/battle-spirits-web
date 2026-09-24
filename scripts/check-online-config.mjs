import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "public", "config", "online-config.js");
const source = fs.readFileSync(file, "utf8");
const match = source.match(/serverUrl:\s*"([^"]+)"/);
if (!match) throw new Error("serverUrl não encontrado em public/config/online-config.js");
const url = match[1].replace(/\/+$/, "");
if (!/^https?:\/\//i.test(url)) throw new Error(`URL inválida: ${url}`);
console.log("Configuração Online OK");
console.log(`Servidor: ${url}`);
console.log(`Health: ${url}/health`);
