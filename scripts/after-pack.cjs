const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;

  const exeName = `${context.packager.appInfo.productFilename}.exe`;
  const source = path.join(context.appOutDir, exeName);
  if (!fs.existsSync(source)) return;

  for (const targetName of ["Battle Spirits Updater.exe", "Battle Spirits Server.exe"]) {
    fs.copyFileSync(source, path.join(context.appOutDir, targetName));
  }
};
