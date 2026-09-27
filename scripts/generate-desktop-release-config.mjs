import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();

function normalizeRepository(value = "") {
  let raw = String(value || "").trim();
  if (!raw) return "";
  raw = raw.replace(/^git@github\.com:/i, "https://github.com/");
  raw = raw.replace(/^ssh:\/\/git@github\.com\//i, "https://github.com/");
  raw = raw.replace(/\.git$/i, "").replace(/\/$/, "");
  const match = raw.match(/github\.com\/([^/]+)\/([^/]+)$/i);
  if (match) return `${match[1]}/${match[2]}`;
  if (/^[^/\s]+\/[^/\s]+$/.test(raw)) return raw;
  return "";
}

function detectRepository() {
  for (const candidate of [process.env.BS_GITHUB_REPOSITORY, process.env.GITHUB_REPOSITORY]) {
    const repo = normalizeRepository(candidate);
    if (repo) return repo;
  }
  try {
    const remote = execFileSync("git", ["config", "--get", "remote.origin.url"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return normalizeRepository(remote);
  } catch {
    return "";
  }
}

let repository = detectRepository();
if (!repository) {
  try {
    const existing = JSON.parse(fs.readFileSync(path.join(root, "config/desktop-release.json"), "utf8"));
    repository = normalizeRepository(existing?.repository || "");
  } catch {}
}
const base = repository ? `https://github.com/${repository}/releases/latest/download` : "";
const config = {
  enabled: Boolean(repository),
  repository,
  releasePage: repository ? `https://github.com/${repository}/releases/latest` : "",
  assets: repository ? {
    windows: `${base}/Battle-Spirits-Windows-Setup.exe`,
    macArm64: `${base}/Battle-Spirits-macOS-arm64.dmg`,
    macX64: `${base}/Battle-Spirits-macOS-x64.dmg`,
    linuxX64AppImage: `${base}/Battle-Spirits-Linux-x64.AppImage`,
    linuxX64Deb: `${base}/Battle-Spirits-Linux-x64.deb`
  } : {}
};

for (const rel of ["public/config/desktop-releases.json", "config/desktop-release.json"]) {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

console.log(repository ? `[desktop releases] ${repository}` : "[desktop releases] repositório GitHub ainda não detectado");
