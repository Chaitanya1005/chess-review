import { describe, expect, it } from "vitest";
import { aggregateAccuracy, gameAccuracy, moveAccuracies, moveAccuracy } from "@/lib/analysis/accuracy";
import type { Color, Score } from "@/lib/engine/types";
import { cp } from "./helpers/fakeAnalysis";

const alternate = (n: number): Color[] => Array.from({ length: n }, (_, i) => (i % 2 === 0 ? "w" : "b"));

describe("moveAccuracy", () => {
  it("is 100 when win% does not drop", () => {
    expect(moveAccuracy(50, 50)).toBe(100);
    expect(moveAccuracy(40, 60)).toBe(100);
  });

  it("decreases as the drop grows and stays in [0, 100]", () => {
    let prev = 101;
    for (let drop = 0.5; drop <= 100; drop += 0.5) {
      const a = moveAccuracy(100, 100 - drop);
      expect(a).toBeLessThanOrEqual(prev);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(100);
      prev = a;
    }
    expect(moveAccuracy(100, 0)).toBe(0);
  });

  it("matches the published curve (+1 uncertainty bonus)", () => {
    const expected = 103.1668100711649 * Math.exp(-0.04354415386753951 * 10) - 3.166924740191411 + 1;
    expect(moveAccuracy(60, 50)).toBeCloseTo(expected, 10);
  });
});

describe("game accuracy", () => {
  it("is null for a player with no moves", () => {
    expect(aggregateAccuracy([])).toBeNull();
    expect(gameAccuracy({ evaluations: [cp(0), cp(10)], movers: ["w"] }).b).toBeNull();
  });

  it("is 100 for a game without any drop", () => {
    const evaluations: Score[] = Array.from({ length: 21 }, () => cp(20));
    const acc = gameAccuracy({ evaluations, movers: alternate(20) });
    expect(acc.w).toBeCloseTo(100, 10);
    expect(acc.b).toBeCloseTo(100, 10);
  });

  it("penalises only the player who blundered", () => {
    // White blunders at move index 10 (ply 11): +0.2 → −5.0.
    const evaluations: Score[] = Array.from({ length: 21 }, (_, i) => cp(i <= 10 ? 20 : -500));
    const acc = gameAccuracy({ evaluations, movers: alternate(20) });
    expect(acc.w!).toBeLessThan(80);
    expect(acc.b).toBeCloseTo(100, 10);
  });

  it("gives one weight per move, clamped to [0.5, 12]", () => {
    const evaluations: Score[] = Array.from({ length: 41 }, (_, i) => cp(i % 2 === 0 ? 0 : 900));
    const per = moveAccuracies({ evaluations, movers: alternate(40) });
    expect(per).toHaveLength(40);
    for (const m of per) {
      expect(m.weight).toBeGreaterThanOrEqual(0.5);
      expect(m.weight).toBeLessThanOrEqual(12);
    }
  });

  it("stays within [0, 100] on random games", () => {
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let g = 0; g < 50; g++) {
      const n = 1 + Math.floor(rand() * 120);
      const evaluations: Score[] = Array.from({ length: n + 1 }, () => cp(Math.round((rand() - 0.5) * 3000)));
      const acc = gameAccuracy({ evaluations, movers: alternate(n) });
      for (const v of [acc.w, acc.b]) {
        if (v === null) continue;
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it("rejects mismatched input", () => {
    expect(() => moveAccuracies({ evaluations: [cp(0)], movers: ["w"] })).toThrow();
  });
});
