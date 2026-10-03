import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function requireFile(relativePath) {
  if (!fs.existsSync(path.join(ROOT, relativePath))) {
    throw new Error(`Missing Arena redesign foundation file: ${relativePath}`);
  }
}

const requiredFiles = [
  "src/features/arena-redesign/ArenaRedesign.jsx",
  "src/features/arena-redesign/index.js",
  "src/features/arena-redesign/constants.js",
  "src/features/arena-redesign/components/ArenaRedesignShell.jsx",
  "src/features/arena-redesign/components/ArenaRedesignSurface.jsx",
  "src/features/arena-redesign/models/createArenaRedesignViewModel.js",
  "src/features/arena-redesign/models/createArenaRedesignViewModel.test.js",
  "src/features/arena-redesign/playmats/playmatRegistry.js",
  "src/features/arena-redesign/playmats/playmatRegistry.test.js",
  "src/features/arena-redesign/playmats/playmatResolver.js",
  "src/features/arena-redesign/styles/arena-redesign.css",
  "public/images/arena/wallpaper_arena_default.png"
];

requiredFiles.forEach(requireFile);

const simulator = read("src/features/arena/Simulator.jsx");
const app = read("src/app/App.jsx");

if (simulator.includes("arena-redesign") || app.includes("arena-redesign")) {
  throw new Error(
    "The parallel Arena redesign must not be wired into the production Arena during foundation phases."
  );
}

const presentationFiles = [
  "src/features/arena-redesign/ArenaRedesign.jsx",
  "src/features/arena-redesign/components/ArenaRedesignShell.jsx",
  "src/features/arena-redesign/components/ArenaRedesignSurface.jsx"
];

for (const relativePath of presentationFiles) {
  const source = read(relativePath);

  if (
    source.includes("/game/") ||
    source.includes("../game/") ||
    source.includes("/online/") ||
    source.includes("../online/") ||
    source.includes("/server/") ||
    source.includes("../server/")
  ) {
    throw new Error(
      `Presentation boundary imports runtime authority directly: ${relativePath}`
    );
  }
}

const viewModel = read(
  "src/features/arena-redesign/models/createArenaRedesignViewModel.js"
);

if (
  viewModel.includes("applyGameAction") ||
  viewModel.includes("dispatch(") ||
  viewModel.includes("socket.")
) {
  throw new Error("Arena redesign View Model must remain presentation-only.");
}

const playmatRegistry = read(
  "src/features/arena-redesign/playmats/playmatRegistry.js"
);

if (
  !playmatRegistry.includes('id: DEFAULT_ARENA_PLAYMAT_ID') ||
  !playmatRegistry.includes(
    'assetUrl: "/images/arena/wallpaper_arena_default.png"'
  )
) {
  throw new Error("Default Arena playmat is not registered correctly.");
}

const styles = read(
  "src/features/arena-redesign/styles/arena-redesign.css"
);

if (!styles.includes("100dvh") || !styles.includes("position: fixed")) {
  throw new Error("Arena redesign shell is not configured as a full-screen surface.");
}

console.log(
  "Arena redesign foundation audit PASS — parallel shell, View Model, full-screen surface and default playmat registry are isolated from the production Arena."
);
