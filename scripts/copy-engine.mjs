// Copies the Stockfish.js engine files from node_modules into public/engine/.
// The files are redistributed unmodified (GPL-3.0). See docs/DECISIONS.md D-016.
import { copyFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = dirname(require.resolve("stockfish/package.json"));
const { buildVersion, version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));

const base = `stockfish-${buildVersion}-lite-single`;
const outDir = join(root, "public", "engine");
mkdirSync(outDir, { recursive: true });

for (const file of [`${base}.js`, `${base}.wasm`]) {
  const src = join(pkgDir, "bin", file);
  if (!existsSync(src)) {
    console.error(`copy-engine: missing ${src}`);
    process.exit(1);
  }
  copyFileSync(src, join(outDir, file));
}
copyFileSync(join(pkgDir, "Copying.txt"), join(outDir, "COPYING.txt"));
console.log(`copy-engine: Stockfish.js ${version} (${base}) -> public/engine/`);
