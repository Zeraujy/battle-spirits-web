const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const resourcesDir = path.join(context.appOutDir, "resources");
  const asarPath = path.join(resourcesDir, "app.asar");
  if (!fs.existsSync(asarPath)) {
    throw new Error("SECURITY: app.asar não foi criado; build Desktop cancelada.");
  }

  // No readable fallback tree should accompany the ASAR.
  const unpacked = path.join(resourcesDir, "app.asar.unpacked");
  if (fs.existsSync(unpacked)) {
    const entries = fs.readdirSync(unpacked).filter((name) => !/^\.DS_Store$/i.test(name));
    if (entries.length) {
      throw new Error(`SECURITY: app.asar.unpacked contém arquivos inesperados: ${entries.join(", ")}`);
    }
  }

  // v4.7.2: the installed client exposes a single game executable.
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
