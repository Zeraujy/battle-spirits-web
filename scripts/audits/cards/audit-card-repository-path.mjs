import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const repositoryPath = path.join(root, 'src/services/cards/cardRepository.js');
const dataPath = path.join(root, 'src/data');
const source = fs.readFileSync(repositoryPath, 'utf8');

const expectedGlob = 'import.meta.glob("../../data/**/*.json"';
if (!source.includes(expectedGlob)) {
  console.error('[card-repository-path] FAIL: cardRepository must load JSON files from src/data using ../../data/**/*.json');
  process.exit(1);
}
if (!fs.existsSync(dataPath) || !fs.statSync(dataPath).isDirectory()) {
  console.error('[card-repository-path] FAIL: src/data is missing');
  process.exit(1);
}
const jsonCount = fs.readdirSync(dataPath, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.json')).length;
if (jsonCount < 1) {
  console.error('[card-repository-path] FAIL: src/data contains no runtime JSON catalog files');
  process.exit(1);
}
console.log(`[card-repository-path] PASS: repository points to src/data (${jsonCount} root JSON catalog files detected)`);
