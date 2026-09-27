const fs = require("node:fs");
const path = require("node:path");

function resolveResourcesDir(context) {
  if (context.electronPlatformName !== "darwin") {
    return path.join(context.appOutDir, "resources");
  }

  // macOS packages the runtime inside <Product>.app/Contents/Resources.
  // appOutDir itself is release/mac (x64) or release/mac-arm64, so looking
  // for release/mac/resources produces a false "app.asar missing" failure.
  const appBundle = fs.readdirSync(context.appOutDir, { withFileTypes: true })
    .find((entry) => entry.isDirectory() && entry.name.endsWith(".app"));

  if (!appBundle) {
    throw new Error(`SECURITY: bundle .app não encontrado em ${context.appOutDir}.`);
  }

  return path.join(context.appOutDir, appBundle.name, "Contents", "Resources");
}

exports.default = async function afterPack(context) {
  const resourcesDir = resolveResourcesDir(context);
  const asarPath = path.join(resourcesDir, "app.asar");
  if (!fs.existsSync(asarPath)) {
    throw new Error(`SECURITY: app.asar não foi criado em ${resourcesDir}; build Desktop cancelada.`);
  }

  // No readable fallback tree should accompany the ASAR.
  const unpacked = path.join(resourcesDir, "app.asar.unpacked");
  if (fs.existsSync(unpacked)) {
    const entries = fs.readdirSync(unpacked).filter((name) => !/^\.DS_Store$/i.test(name));
    if (entries.length) {
      throw new Error(`SECURITY: app.asar.unpacked contém arquivos inesperados: ${entries.join(", ")}`);
    }
  }

  // The installed Windows client exposes only the main game executable.
  // Updating is performed by the main app itself; no Server.exe or Updater.exe
  // clones are created beside the game binary.
  if (context.electronPlatformName === "win32") {
    const forbidden = [
      "Battle Spirits KAIHOU Updater.exe",
      "Battle Spirits KAIHOU Server.exe",
      "Battle Spirits Updater.exe",
      "Battle Spirits Server.exe"
    ];
    const leaked = forbidden.filter((name) => fs.existsSync(path.join(context.appOutDir, name)));
    if (leaked.length) {
      throw new Error(`DESKTOP PACKAGING: executáveis auxiliares expostos: ${leaked.join(", ")}`);
    }
  }
};
