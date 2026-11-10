/**
 * Real-engine integration tests: the same Stockfish.js 19 lite single-threaded WASM build
 * that the browser uses, loaded in Node. No mocks.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { UciEngine } from "@/lib/engine/UciEngine";
import { createNodeTransport } from "@/lib/engine/nodeTransport";
import { analyzeGame, createAnalysisCache } from "@/lib/analysis/analyzeGame";
import { mateWinner } from "@/lib/analysis/evaluation";
import { parsePgn } from "@/lib/pgn/parsePgn";
import { OPERA_GAME, SCHOLARS_MATE } from "./fixtures/games";
import type { GameAnalysis } from "@/lib/analysis/types";

const DEPTH = 10;
let engine: UciEngine;

beforeAll(async () => {
  engine = new UciEngine(createNodeTransport());
  await engine.init();
});
afterAll(() => engine?.dispose());

function expectLegalBestMoves(analysis: GameAnalysis) {
  for (const p of analysis.positions) {
    if (p.terminal) continue;
    const chess = new Chess(p.fen);
    const legal = chess.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ""));
    expect(legal, `ply ${p.ply}`).toContain(p.bestMove);
    // The PV must start with a legal move too, and lines are sorted by multipv.
    expect(legal).toContain(p.lines[0].pv[0]);
    expect(p.lines.map((l) => l.multiPv)).toEqual([...p.lines.map((l) => l.multiPv)].sort());
  }
}

describe("Stockfish integration (Node, real WASM engine)", () => {
  it("identifies itself as Stockfish 19", () => {
    expect(engine.name).toMatch(/^Stockfish 19/);
  });

  it("analyses Scholar's mate: one result per position, White POV, terminal mate by rules", async () => {
    const game = parsePgn(SCHOLARS_MATE);
    const analysis = await analyzeGame(game, engine, { depth: DEPTH, multiPv: 2 });

    expect(analysis.positions).toHaveLength(game.moves.length + 1);
    analysis.positions.forEach((p, i) => {
      expect(p.ply).toBe(i);
      expect(p.fen).toBe(i === 0 ? game.startFen : game.moves[i - 1].fenAfter);
    });
    expectLegalBestMoves(analysis);

    // After 3...Nf6?? (ply 6) White has mate in 1: White POV mate +1.
    const beforeMate = analysis.positions[6];
    expect(beforeMate.sideToMove).toBe("w");
    expect(beforeMate.evaluation).toEqual({ type: "mate", value: 1 });
    expect(beforeMate.bestMove).toBe("h5f7");

    // Final position: Black is checkmated, handled by rules, White wins.
    const final = analysis.positions[7];
    expect(final).toMatchObject({ terminal: "checkmate", source: "rules", lines: [] });
    expect(mateWinner(final.evaluation)).toBe("w");

    // Depth and MultiPV recorded.
    expect(analysis.settings).toMatchObject({ depth: DEPTH, multiPv: 2 });
    expect(analysis.positions[0].depth).toBeGreaterThanOrEqual(DEPTH);
    expect(analysis.positions[0].lines).toHaveLength(2);
  });

  it("keeps a consistent White perspective whichever side is to move", async () => {
    // White is up a queen; evaluate with White to move and with Black to move.
    const whiteToMove = parsePgn('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1"]\n\n1. Qd3 Ke7 *');
    const analysis = await analyzeGame(whiteToMove, engine, { depth: DEPTH, multiPv: 1 });
    for (const p of analysis.positions) {
      const s = p.evaluation;
      const whiteWinning = s.type === "cp" ? s.value > 500 : mateWinner(s) === "w";
      expect(whiteWinning, `ply ${p.ply} side ${p.sideToMove} eval ${JSON.stringify(s)}`).toBe(true);
      if (p.wdl) expect(p.wdl[0]).toBeGreaterThan(p.wdl[2]);
    }
    expect(analysis.positions.map((p) => p.sideToMove)).toEqual(["w", "b", "w"]);
  });

  it("analyses a complete 33-move game without crashing and detects the decisive swing", async () => {
    const game = parsePgn(OPERA_GAME);
    const progress: number[] = [];
    const analysis = await analyzeGame(game, engine, {
      depth: DEPTH,
      multiPv: 2,
      onProgress: ({ done }) => progress.push(done),
    });
    expect(analysis.positions).toHaveLength(34);
    expect(progress).toEqual(Array.from({ length: 34 }, (_, i) => i + 1));
    expectLegalBestMoves(analysis);
    // Morphy is winning by the end: position after 16. Qb8+ (ply 31) is a forced mate for White.
    expect(mateWinner(analysis.positions[31].evaluation)).toBe("w");
    expect(analysis.positions[33]).toMatchObject({ terminal: "checkmate" });
  });

  it("serves repeated analyses from the cache", async () => {
    const game = parsePgn(SCHOLARS_MATE);
    const cache = createAnalysisCache();
    const first = await analyzeGame(game, engine, { depth: 8, multiPv: 1, cache });
    const second = await analyzeGame(game, engine, { depth: 8, multiPv: 1, cache });
    expect(first.positions.filter((p) => p.source === "engine")).toHaveLength(7);
    expect(second.positions.filter((p) => p.source === "engine")).toHaveLength(0);
    expect(second.positions.map((p) => p.evaluation)).toEqual(first.positions.map((p) => p.evaluation));
  });

  it("can be aborted mid-game", async () => {
    const game = parsePgn(OPERA_GAME);
    const controller = new AbortController();
    const run = analyzeGame(game, engine, {
      depth: 18,
      multiPv: 1,
      signal: controller.signal,
      onProgress: ({ done }) => {
        if (done === 3) controller.abort();
      },
    });
    await expect(run).rejects.toMatchObject({ name: "AbortError" });
    // The engine is still usable afterwards.
    const after = await engine.analyse({ startFen: game.startFen, moves: [], depth: 5, multiPv: 1 });
    expect(after.bestMove).toMatch(/^[a-h][1-8][a-h][1-8]/);
  });
});
