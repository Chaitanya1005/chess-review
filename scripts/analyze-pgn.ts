/**
 * Analyse a PGN in Node with the same Stockfish WASM build the browser uses, and print the review.
 *
 *   npm run analyze -- game.pgn [--depth 14] [--multipv 2] [--out review.json] [--json]
 *
 * --out writes { analysis, review } JSON (frozen engine output for benchmarking, docs/BENCHMARKING.md §4).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { analyzeGame } from "../src/lib/analysis/analyzeGame";
import { formatScore } from "../src/lib/analysis/evaluation";
import { CLASSIFICATIONS } from "../src/lib/analysis/moveClassification";
import { createNodeTransport } from "../src/lib/engine/nodeTransport";
import { UciEngine } from "../src/lib/engine/UciEngine";
import { parsePgn } from "../src/lib/pgn/parsePgn";
import { buildReview } from "../src/lib/review/buildReview";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith("--")) {
    console.error("usage: npm run analyze -- <game.pgn> [--depth N] [--multipv N] [--out file.json] [--json]");
    process.exit(2);
  }
  const depth = Number(arg("depth") ?? 14);
  const multiPv = Number(arg("multipv") ?? 2);
  const game = parsePgn(readFileSync(file, "utf8"));
  game.warnings.forEach((w) => console.error(`warning: ${w}`));

  const engine = new UciEngine(createNodeTransport());
  try {
    await engine.init();
    const analysis = await analyzeGame(game, engine, {
      depth,
      multiPv,
      onProgress: ({ done, total }) => process.stderr.write(`\ranalysing ${done}/${total}`),
    });
    process.stderr.write("\n");
    const review = buildReview(analysis);

    if (arg("out")) writeFileSync(arg("out")!, JSON.stringify({ analysis, review }, null, 2));
    if (process.argv.includes("--json")) {
      console.log(JSON.stringify(review, null, 2));
      return;
    }

    console.log(`${review.settings.engine} · depth ${depth} · MultiPV ${multiPv} · ${review.classificationVersion} · ${analysis.durationMs} ms`);
    for (const m of review.moves) {
      const num = `${m.moveNumber}${m.color === "w" ? "." : "..."}`;
      const best = m.isEngineBest ? "" : `best ${m.bestMoveSan ?? "?"}`;
      console.log(
        `${num.padStart(5)} ${m.san.padEnd(8)} ${m.classification.padEnd(10)} loss ${m.epLoss.toFixed(3)}  ${formatScore(m.evalBefore).padStart(6)} → ${formatScore(m.evalAfter).padEnd(6)} ${m.phase.padEnd(10)} ${best} ${m.reasons.join(",")}`,
      );
    }
    for (const color of ["w", "b"] as const) {
      const p = review.players[color];
      const counts = CLASSIFICATIONS.filter((c) => p.counts[c] > 0)
        .map((c) => `${c} ${p.counts[c]}`)
        .join(", ");
      const rating = p.rating ? `${p.rating.value}${p.rating.calibrated ? "" : " (uncalibrated)"}` : "—";
      console.log(`${color === "w" ? "White" : "Black"} ${p.name}: accuracy ${p.accuracy?.toFixed(1) ?? "—"}, est. rating ${rating}; ${counts}`);
    }
  } finally {
    engine.dispose();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
