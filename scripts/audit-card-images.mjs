import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cardsRoot = path.join(root, "public", "cards-database");
const MIN_WIDTH = 300;
const MIN_HEIGHT = 437;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function readPngSize(buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readWebpSize(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;

    if (type === "VP8X" && data + 10 <= buffer.length) {
      const width = 1 + buffer[data + 4] + (buffer[data + 5] << 8) + (buffer[data + 6] << 16);
      const height = 1 + buffer[data + 7] + (buffer[data + 8] << 8) + (buffer[data + 9] << 16);
      return { width, height };
    }

    if (type === "VP8 " && data + 10 <= buffer.length) {
      // Lossy VP8 frame header: 9d 01 2a followed by 14-bit width / height.
      for (let i = data; i + 9 < Math.min(data + size, buffer.length); i += 1) {
        if (buffer[i + 3] === 0x9d && buffer[i + 4] === 0x01 && buffer[i + 5] === 0x2a) {
          return {
            width: buffer.readUInt16LE(i + 6) & 0x3fff,
            height: buffer.readUInt16LE(i + 8) & 0x3fff
          };
        }
      }
    }

    if (type === "VP8L" && data + 5 <= buffer.length && buffer[data] === 0x2f) {
      const b1 = buffer[data + 1];
      const b2 = buffer[data + 2];
      const b3 = buffer[data + 3];
      const b4 = buffer[data + 4];
      return {
        width: 1 + (((b2 & 0x3f) << 8) | b1),
        height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6))
      };
    }

    offset = data + size + (size % 2);
  }
  return null;
}

if (!fs.existsSync(cardsRoot)) {
  console.error("ERRO: public/cards-database não encontrado.");
  process.exit(1);
}

const files = walk(cardsRoot).filter((file) => /\.(webp|png)$/i.test(file));
const lowResolution = [];
const unreadable = [];
let smallest = null;

for (const file of files) {
  const buffer = fs.readFileSync(file);
  const size = /\.png$/i.test(file) ? readPngSize(buffer) : readWebpSize(buffer);
  if (!size) {
    unreadable.push(path.relative(root, file));
    continue;
  }

  if (!smallest || size.width * size.height < smallest.width * smallest.height) {
    smallest = { ...size, file: path.relative(root, file) };
  }

  if (size.width < MIN_WIDTH || size.height < MIN_HEIGHT) {
    lowResolution.push({ file: path.relative(root, file), ...size });
  }
}

console.log("Card image audit");
console.log(`- imagens verificadas: ${files.length}`);
if (smallest) console.log(`- menor imagem: ${smallest.width}x${smallest.height} (${smallest.file})`);
console.log(`- abaixo de ${MIN_WIDTH}x${MIN_HEIGHT}: ${lowResolution.length}`);
console.log(`- dimensões não reconhecidas: ${unreadable.length}`);

if (lowResolution.length) {
  for (const item of lowResolution.slice(0, 12)) {
    console.warn(`  AVISO ${item.width}x${item.height}: ${item.file}`);
  }
}
if (unreadable.length) {
  for (const file of unreadable.slice(0, 12)) console.warn(`  AVISO leitura: ${file}`);
}

// v3.3.1c uses 300x437 WebP as the canonical web format. Images below that
// size are reported as warnings; corrupt/unreadable assets still fail verification.
if (unreadable.length) process.exit(1);
