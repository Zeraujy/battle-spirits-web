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

  if (context.electronPlatformName !== "win32") return;
  const exeName = `${context.packager.appInfo.productFilename}.exe`;
  const source = path.join(context.appOutDir, exeName);
  if (!fs.existsSync(source)) return;

  for (const targetName of ["Battle Spirits KAIHOU Updater.exe", "Battle Spirits KAIHOU Server.exe", "Battle Spirits Updater.exe", "Battle Spirits Server.exe"]) {
    fs.copyFileSync(source, path.join(context.appOutDir, targetName));
  }
};
