/**
 * End-to-end: PGN → real Stockfish WASM analysis (Node) → buildReview.
 * Engine-dependent expectations use a fixed engine build and depth, so they are reproducible.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyzeGame } from "@/lib/analysis/analyzeGame";
import { CLASSIFICATIONS } from "@/lib/analysis/moveClassification";
import type { GameAnalysis } from "@/lib/analysis/types";
import { createNodeTransport } from "@/lib/engine/nodeTransport";
import { UciEngine } from "@/lib/engine/UciEngine";
import { parsePgn } from "@/lib/pgn/parsePgn";
import { buildReview } from "@/lib/review/buildReview";
import { OPERA_GAME, SCHOLARS_MATE } from "./fixtures/games";

let engine: UciEngine;
let opera: GameAnalysis;

beforeAll(async () => {
  engine = new UciEngine(createNodeTransport());
  opera = await analyzeGame(parsePgn(OPERA_GAME), engine, { depth: 16, multiPv: 2 });
}, 180_000);
afterAll(() => engine?.dispose());

describe("buildReview on real engine output", () => {
  it("classifies every move exactly once and reconciles statistics", () => {
    const review = buildReview(opera);
    expect(review.moves).toHaveLength(33);
    expect(review.classificationVersion).toBe("cls-v1");
    for (const color of ["w", "b"] as const) {
      const p = review.players[color];
      const own = review.moves.filter((m) => m.color === color);
      expect(p.moveCount).toBe(own.length);
      for (const c of CLASSIFICATIONS) expect(p.counts[c]).toBe(own.filter((m) => m.classification === c).length);
      const phaseTotal = p.phases.opening.moveCount + p.phases.middlegame.moveCount + p.phases.endgame.moveCount;
      expect(phaseTotal).toBe(own.length);
      expect(p.accuracy).toBeGreaterThanOrEqual(0);
      expect(p.accuracy).toBeLessThanOrEqual(100);
    }
  });

  it("does not confuse player perspectives: Morphy's accuracy is higher", () => {
    const review = buildReview(opera);
    expect(review.players.w.name).toBe("Paul Morphy");
    expect(review.players.w.accuracy!).toBeGreaterThan(review.players.b.accuracy!);
    expect(review.moves.filter((m) => m.color === "b").every((m) => m.classification !== "brilliant")).toBe(true);
  });

  it("finds the queen sacrifice 16.Qb8+ as Brilliant and labels the mating move Best", () => {
    const review = buildReview(opera);
    const bySan = (san: string) => review.moves.find((m) => m.san === san)!;
    expect(bySan("Qb8+")).toMatchObject({ classification: "brilliant", color: "w" });
    expect(bySan("Rd8#").classification).toBe("best");
    expect(bySan("Bg4").classification).not.toBe("best");
  });

  it("is deterministic and provides SAN lines for explanations", () => {
    const a = buildReview(opera);
    const b = buildReview(opera);
    expect(a).toEqual(b);
    const nf6 = a.moves.find((m) => m.ply === 12)!; // 6...Nf6
    expect(nf6.san).toBe("Nf6");
    expect(nf6.bestMoveSan).toBeTruthy();
    expect(nf6.bestLineSan[0]).toBe(nf6.bestMoveSan);
  });

  it("handles a short game ending in mate", async () => {
    const analysis = await analyzeGame(parsePgn(SCHOLARS_MATE), engine, { depth: 12, multiPv: 2 });
    const review = buildReview(analysis);
    const last = review.moves.at(-1)!;
    expect(last).toMatchObject({ san: "Qxf7#", classification: "best" });
    expect(review.moves.find((m) => m.san === "Nf6")!.classification).toBe("blunder");
  });
});
