import { describe, expect, it } from "vitest";
import { movePhases, positionPhases } from "@/lib/analysis/gamePhases";
import { estimateRating } from "@/lib/analysis/performanceRating";
import { playerStats } from "@/lib/analysis/gameStatistics";
import { CLASSIFICATIONS } from "@/lib/analysis/moveClassification";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const DEVELOPED = "r2q1rk1/ppp2ppp/2nbbn2/3pp3/3PP3/2NBBN2/PPP2PPP/R2Q1RK1 w - - 0 8";
const ENDGAME = "8/5pk1/6p1/8/3R4/6P1/r4PKP/8 w - - 0 40";

describe("game phases", () => {
  it("starts in the opening, moves to middlegame when back ranks empty, endgame with few pieces", () => {
    expect(positionPhases([START, DEVELOPED, ENDGAME])).toEqual(["opening", "middlegame", "endgame"]);
  });

  it("never goes backwards", () => {
    expect(positionPhases([START, ENDGAME, START])).toEqual(["opening", "endgame", "endgame"]);
  });

  it("ends the opening after the configured ply", () => {
    const phases = positionPhases(Array.from({ length: 40 }, () => START));
    expect(phases[30]).toBe("opening");
    expect(phases[31]).toBe("middlegame");
  });

  it("assigns each move the phase of the position before it", () => {
    expect(movePhases([START, DEVELOPED, ENDGAME])).toEqual(["opening", "middlegame"]);
  });
});

describe("estimateRating (uncalibrated placeholder)", () => {
  it("is monotonic, clamped, rounded and flagged uncalibrated", () => {
    let prev = 0;
    for (let a = 0; a <= 100; a += 2.5) {
      const r = estimateRating(a)!;
      expect(r.value).toBeGreaterThanOrEqual(prev);
      expect(r.value).toBeGreaterThanOrEqual(100);
      expect(r.value).toBeLessThanOrEqual(3200);
      expect(r.value % 50).toBe(0);
      expect(r.calibrated).toBe(false);
      prev = r.value;
    }
  });

  it("returns null without an accuracy", () => {
    expect(estimateRating(null)).toBeNull();
  });
});

describe("playerStats", () => {
  it("reconciles counts with classifications, overall and per phase", () => {
    const moves = CLASSIFICATIONS.flatMap((classification, i) => [
      { color: "w" as const, classification, phase: i < 4 ? ("opening" as const) : ("middlegame" as const), accuracy: { accuracy: 90, weight: 1 } },
      { color: "b" as const, classification: "best" as const, phase: "endgame" as const, accuracy: { accuracy: 100, weight: 1 } },
    ]);
    const white = playerStats(moves, "w");
    const black = playerStats(moves, "b");
    expect(white.moveCount).toBe(9);
    expect(Object.values(white.counts).reduce((a, b) => a + b, 0)).toBe(9);
    expect(Object.values(white.counts).every((c) => c === 1)).toBe(true);
    expect(white.phases.opening.moveCount + white.phases.middlegame.moveCount + white.phases.endgame.moveCount).toBe(9);
    expect(white.phases.endgame.accuracy).toBeNull();
    expect(black.counts.best).toBe(9);
    expect(black.accuracy).toBeCloseTo(100, 10);
  });
});
