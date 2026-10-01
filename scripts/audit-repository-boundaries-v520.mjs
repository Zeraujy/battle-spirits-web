import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_ROOTS = ['src', 'server'];
const EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const importPattern = /^\s*import(?:[^"']*?from\s*)?["']([^"']+)["']/gm;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function classify(rel) {
  const p = rel.replaceAll('\\', '/');
  if (p.startsWith('server/')) return 'server';
  if (p.startsWith('src/components/') || p.startsWith('src/pages/') || p.startsWith('src/styles/')) return 'web-ui';
  if (p.startsWith('src/game/')) return 'game-engine';
  if (p.startsWith('src/online/')) return 'online-client';
  if (p.startsWith('src/services/')) return 'services';
  if (p.startsWith('src/data/')) return 'content-src';
  if (p.startsWith('src/config/')) return 'config';
  if (p.startsWith('src/interactions/')) return 'interactions';
  return 'other-src';
}

function resolveImport(sourceFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const absolute = path.resolve(path.dirname(sourceFile), specifier);
  const relative = path.relative(ROOT, absolute).replaceAll('\\', '/');
  return relative;
}

const edges = [];
for (const root of SOURCE_ROOTS) {
  const abs = path.join(ROOT, root);
  if (!fs.existsSync(abs)) continue;
  for (const file of walk(abs)) {
    const relativeFile = path.relative(ROOT, file).replaceAll('\\', '/');
    const sourceLayer = classify(relativeFile);
    const text = fs.readFileSync(file, 'utf8');
    importPattern.lastIndex = 0;
    let match;
    while ((match = importPattern.exec(text))) {
      const target = resolveImport(file, match[1]);
      if (!target) continue;
      edges.push({
        source: relativeFile,
        sourceLayer,
        specifier: match[1],
        target,
        targetLayer: classify(target),
      });
    }
  }
}

const counts = {};
for (const edge of edges) {
  const key = `${edge.sourceLayer} -> ${edge.targetLayer}`;
  counts[key] = (counts[key] ?? 0) + 1;
}

const forbidden = edges.filter((edge) =>
  (edge.sourceLayer === 'game-engine' && edge.targetLayer === 'web-ui') ||
  (edge.sourceLayer === 'server' && edge.targetLayer === 'web-ui')
);

const migrationDebt = {
  webUiToGameEngine: edges.filter((e) => e.sourceLayer === 'web-ui' && e.targetLayer === 'game-engine'),
  serverToGameEngine: edges.filter((e) => e.sourceLayer === 'server' && e.targetLayer === 'game-engine'),
  webUiToServices: edges.filter((e) => e.sourceLayer === 'web-ui' && e.targetLayer === 'services'),
};

const result = {
  audit: 'v5.2.0-phase00-repository-boundaries',
  generatedAt: new Date().toISOString(),
  status: forbidden.length === 0 ? 'PASS' : 'FAIL',
  rules: [
    'game-engine must not import web-ui',
    'server must not import web-ui',
    'existing web-ui -> game-engine imports are migration debt, not a Phase 0 failure',
  ],
  counts,
  forbidden,
  migrationDebt: {
    webUiToGameEngine: migrationDebt.webUiToGameEngine.length,
    serverToGameEngine: migrationDebt.serverToGameEngine.length,
    webUiToServices: migrationDebt.webUiToServices.length,
  },
  examples: {
    webUiToGameEngine: migrationDebt.webUiToGameEngine.slice(0, 12),
    serverToGameEngine: migrationDebt.serverToGameEngine.slice(0, 12),
  },
};

console.log(JSON.stringify(result, null, 2));
if (forbidden.length) process.exitCode = 1;
