import { describe, expect, it } from "vitest";
import { expectedPoints, expectedPointsWhite, sameScore, winPercent } from "@/lib/analysis/expectedPoints";
import { cp, mate } from "./helpers/fakeAnalysis";

describe("expected points", () => {
  it("is 0.5 at equality and symmetric", () => {
    expect(expectedPointsWhite(cp(0))).toBe(0.5);
    for (const v of [15, 80, 250, 600, 2000]) {
      expect(expectedPointsWhite(cp(v)) + expectedPointsWhite(cp(-v))).toBeCloseTo(1, 12);
    }
  });

  it("is monotonic in centipawns", () => {
    let prev = -1;
    for (let v = -1200; v <= 1200; v += 25) {
      const ep = expectedPointsWhite(cp(v));
      expect(ep).toBeGreaterThanOrEqual(prev);
      prev = ep;
    }
  });

  it("matches the published Lichess curve (Win% = 50 + 50·(2/(1+e^(−0.00368208·cp)) − 1))", () => {
    const lichess = (c: number) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
    for (const c of [-300, -50, 0, 100, 400]) expect(winPercent(cp(c), "w")).toBeCloseTo(lichess(c), 10);
  });

  it("clamps large centipawn values", () => {
    expect(expectedPointsWhite(cp(5000))).toBe(expectedPointsWhite(cp(1000)));
  });

  it("maps mates to certain results", () => {
    expect(expectedPointsWhite(mate(3))).toBe(1);
    expect(expectedPointsWhite(mate(-1))).toBe(0);
    expect(expectedPointsWhite({ type: "mate", value: 0, winner: "b" })).toBe(0);
  });

  it("uses the requested player's perspective", () => {
    expect(expectedPoints(cp(200), "b")).toBeCloseTo(1 - expectedPoints(cp(200), "w"), 12);
    expect(expectedPoints(mate(2), "b")).toBe(0);
  });

  it("compares scores", () => {
    expect(sameScore(cp(10), cp(10))).toBe(true);
    expect(sameScore(cp(10), cp(11))).toBe(false);
    expect(sameScore(mate(2), cp(2))).toBe(false);
  });
});
