import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MANIFEST = 'architecture/v5.2.0/internal-domains.json';
const EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const importPattern = /(?:^\s*import(?:[^"']*?from\s*)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\))/gm;

function fail(message) {
  console.error(`FAIL  ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`OK  ${message}`);
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function norm(value) {
  return value.replaceAll('\\', '/');
}

function classify(rel) {
  const p = norm(rel);
  if (p.startsWith('server/')) return 'server-runtime';
  if (p.startsWith('src/game/')) return 'server-engine';
  if (p.startsWith('src/shared/')) return 'shared';
  if (p.startsWith('src/online/domain/')) return 'shared';
  if (p === 'src/online/customMatchSettings.js') return 'shared';
  if (p === 'src/online/sync/stateSync.js') return 'shared';
  if (p.startsWith('src/content/')) return 'content-facade';
  if (p.startsWith('src/data/')) return 'content-source';
  if (
    p.startsWith('src/pages/') || p.startsWith('src/components/') ||
    p.startsWith('src/styles/') || p.startsWith('src/arena/') ||
    p.startsWith('src/interactions/') || p.startsWith('src/config/') ||
    p.startsWith('src/services/') || p.startsWith('src/online/') ||
    p === 'src/App.jsx' || p === 'src/main.jsx' || p === 'src/i18n.jsx'
  ) return 'web';
  return 'other';
}

function resolveRelative(sourceFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const absolute = path.resolve(path.dirname(sourceFile), specifier);
  return norm(path.relative(ROOT, absolute));
}

if (!exists(MANIFEST)) {
  fail(`${MANIFEST} missing`);
  process.exit();
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST), 'utf8'));
for (const required of ['web', 'server', 'content', 'shared']) {
  if (!manifest.domains?.[required]) fail(`domain descriptor missing: ${required}`);
  else ok(`domain descriptor: ${required}`);
}

for (const [name, domain] of Object.entries(manifest.domains ?? {})) {
  for (const root of domain.roots ?? []) {
    if (!exists(root)) fail(`${name} domain root missing: ${root}`);
  }
  for (const entry of domain.publicEntryPoints ?? []) {
    if (!exists(entry)) fail(`${name} public entry point missing: ${entry}`);
  }
}

const sources = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'server'))];
const edges = [];
for (const file of sources) {
  const source = norm(path.relative(ROOT, file));
  const sourceDomain = classify(source);
  const text = fs.readFileSync(file, 'utf8');
  importPattern.lastIndex = 0;
  let match;
  while ((match = importPattern.exec(text))) {
    const specifier = match[1] ?? match[2];
    const target = resolveRelative(file, specifier);
    if (!target) continue;
    edges.push({ source, sourceDomain, specifier, target, targetDomain: classify(target) });
  }
}

const forbidden = [];
for (const edge of edges) {
  if (/\.test\.[cm]?[jt]sx?$/.test(edge.source)) continue;
  const s = edge.sourceDomain;
  const t = edge.targetDomain;

  if (s === 'shared' && ['web', 'server-runtime', 'server-engine', 'content-facade', 'content-source'].includes(t)) {
    forbidden.push({ ...edge, rule: 'shared must stay implementation-neutral' });
  }
  if (['content-facade', 'content-source'].includes(s) && ['web', 'server-runtime', 'server-engine'].includes(t)) {
    forbidden.push({ ...edge, rule: 'content must not depend on web/server implementation' });
  }
  if (['server-runtime', 'server-engine'].includes(s) && t === 'web') {
    forbidden.push({ ...edge, rule: 'server-owned code must not depend on web' });
  }
  if (s === 'web' && t === 'server-runtime') {
    forbidden.push({ ...edge, rule: 'web must not import authoritative server implementation' });
  }
}

const legacyContentFiles = new Set([
  'src/data/shopCatalog.js',
  'src/data/shopSagas.js',
  'src/data/prebuiltDecks.js',
]);
const directLegacyContentConsumers = edges.filter((edge) =>
  edge.sourceDomain === 'web' && legacyContentFiles.has(edge.target)
);
for (const edge of directLegacyContentConsumers) {
  forbidden.push({ ...edge, rule: 'web must consume migrated structured content through src/content/index.js' });
}

const simulator = fs.readFileSync(path.join(ROOT, 'src/pages/Simulator.jsx'), 'utf8');
if (!simulator.includes('from "../arena/index.js"')) {
  fail('Simulator must consume the Arena through src/arena/index.js');
} else {
  ok('Simulator consumes Arena public facade');
}
if (simulator.includes('../arena/controller/') || simulator.includes('../arena/viewModel/')) {
  fail('Simulator still imports Arena internals directly');
}

const vmFiles = ['src/arena/viewModel/arenaViewModel.js', 'src/arena/viewModel/arenaViewModel.test.js'];
for (const rel of vmFiles) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (text.includes('../../shared/contracts/')) fail(`${rel} bypasses shared public facade`);
}
ok('Arena ViewModel consumes shared public facade');

const counts = Object.create(null);
for (const edge of edges) {
  const key = `${edge.sourceDomain} -> ${edge.targetDomain}`;
  counts[key] = (counts[key] ?? 0) + 1;
}

if (forbidden.length) {
  for (const item of forbidden) {
    fail(`${item.rule}: ${item.source} -> ${item.target}`);
  }
} else {
  ok('internal repository dependency directions');
}

console.log(JSON.stringify({
  audit: 'v5.2.0-phase04-internal-repository-shape',
  status: process.exitCode ? 'FAIL' : 'PASS',
  domains: Object.keys(manifest.domains ?? {}),
  edgeCounts: counts,
  forbiddenCount: forbidden.length,
  transitionalNotes: {
    gameEngineOwner: 'future kaihou-server; remains in src/game for Local/CPU compatibility during v5.2.0',
    contentPhysicalMove: 'deferred; src/content/index.js is the stable public facade for migrated structured content',
    physicalRepositorySplit: 'not performed in Phase 4'
  }
}, null, 2));
