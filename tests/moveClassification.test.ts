import { describe, expect, it } from "vitest";
import { baseClassification, classifyMoves } from "@/lib/analysis/moveClassification";
import { parsePgn } from "@/lib/pgn/parsePgn";
import { cp, fakePositions, mate, type FakeSpec } from "./helpers/fakeAnalysis";

// Moves: e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 (6 moves, 7 positions).
const RUY = parsePgn("1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *");
const quiet = (n: number): FakeSpec[] => Array.from({ length: n }, () => ({ eval: cp(20) }));

function classify(game: ReturnType<typeof parsePgn>, specs: FakeSpec[]) {
  return classifyMoves(game.moves, fakePositions(game, specs));
}

describe("baseClassification (Chess.com public thresholds, upper bound inclusive)", () => {
  it.each([
    [0, true, "best"],
    [0.3, true, "best"],
    [0, false, "best"],
    [0.0001, false, "excellent"],
    [0.02, false, "excellent"],
    [0.0201, false, "good"],
    [0.05, false, "good"],
    [0.0501, false, "inaccuracy"],
    [0.1, false, "inaccuracy"],
    [0.1001, false, "mistake"],
    [0.2, false, "mistake"],
    [0.2001, false, "blunder"],
    [1, false, "blunder"],
  ] as const)("loss %s, engine-best %s → %s", (loss, best, label) => {
    expect(baseClassification(loss, best)).toBe(label);
  });
});

describe("classifyMoves", () => {
  it("labels the engine's move Best even if the next evaluation is lower (search noise)", () => {
    const specs = quiet(7);
    specs[0] = { eval: cp(30), best: "e2e4" };
    specs[1] = { eval: cp(-100) };
    const [first] = classify(RUY, specs);
    expect(first).toMatchObject({ classification: "best", isEngineBest: true, epLoss: 0 });
  });

  it("computes expected-points loss from the mover's perspective for both colours", () => {
    const specs = quiet(7);
    specs[0] = { eval: cp(30), best: "d2d4" };
    specs[1] = { eval: cp(-200) }; // White lost ~0.20 EP
    specs[2] = { eval: cp(330) }; // Black lost ~0.24 EP
    const [white, black] = classify(RUY, specs);
    expect(white.epLoss).toBeCloseTo(0.2039, 3);
    expect(white.classification).toBe("blunder");
    expect(black.epLoss).toBeGreaterThan(0.2);
    expect(black.color).toBe("b");
    expect(black.baseClassification).toBe("blunder");
    // White had just blundered and Black gave the whole advantage back: a Miss.
    expect(black.classification).toBe("miss");
  });

  it("does not penalise a move that improves the position", () => {
    const specs = quiet(7);
    specs[1] = { eval: cp(-50) };
    specs[2] = { eval: cp(-300) }; // Black's move made Black's position better
    expect(classify(RUY, specs)[1]).toMatchObject({ epLoss: 0, classification: "best" });
  });

  describe("Great", () => {
    const greatSpecs = (second: number, eval_: FakeSpec["eval"] = cp(50)) => {
      const specs = quiet(7);
      specs[2] = { eval: eval_, best: "g1f3", second: cp(second) };
      return specs;
    };

    it("is given for the only move that holds (gap ≥ 0.15)", () => {
      const m = classify(RUY, greatSpecs(-300))[2];
      expect(m.classification).toBe("great");
      expect(m.reasons).toContain("only-move");
    });

    it("is not given when the second line is nearly as good", () => {
      expect(classify(RUY, greatSpecs(20))[2].classification).toBe("best");
    });

    it("is not given when the mover already had a forced mate", () => {
      expect(classify(RUY, greatSpecs(-300, mate(2)))[2].classification).toBe("best");
    });

    it("is not given for getting out of check", () => {
      const game = parsePgn("1. e4 f5 2. Qh5+ g6 *");
      const specs = quiet(5);
      specs[3] = { eval: cp(0), best: "g7g6", second: mate(1) };
      expect(classify(game, specs)[3].classification).toBe("best");
    });

    it("is not given for a plain recapture", () => {
      const game = parsePgn("1. e4 d5 2. exd5 Qxd5 *");
      const specs = quiet(5);
      specs[3] = { eval: cp(0), best: "d8d5", second: cp(500) }; // Black must recapture
      expect(classify(game, specs)[3].classification).toBe("best");
    });
  });

  describe("Brilliant", () => {
    const GREEK = parsePgn(
      '[SetUp "1"]\n[FEN "r1bq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R2QK2R w KQ - 0 9"]\n\n9. Bxh7+ Kxh7 *',
    );
    const specs = (opts: { second?: number; after?: number } = {}): FakeSpec[] => [
      { eval: cp(150), best: "d3h7", second: cp(opts.second ?? 40) },
      { eval: cp(opts.after ?? 160), best: "g8h7", pv: ["f3g5", "h7g8", "d1h5"] },
      { eval: cp(170) },
    ];

    it("is given for a sound best-move sacrifice", () => {
      const m = classify(GREEK, specs())[0];
      expect(m.classification).toBe("brilliant");
      expect(m.sacrifice).toMatchObject({ isSacrifice: true, kind: "pv" });
    });

    it("is not given when the player was already completely winning without it", () => {
      expect(classify(GREEK, specs({ second: 900 }))[0].classification).toBe("best");
    });

    it("is not given when the position is bad after the sacrifice", () => {
      expect(classify(GREEK, specs({ after: -300 }))[0].classification).not.toBe("brilliant");
    });

    it("is not given for a non-sacrifice that matches the engine", () => {
      const s = quiet(7);
      s[0] = { eval: cp(30), best: "e2e4", second: cp(25) };
      expect(classify(RUY, s)[0].classification).toBe("best");
    });
  });

  describe("Miss", () => {
    // Ply 3 (2.Nf3) is a White blunder; ply 4 is Black's reply.
    const missSpecs = (afterReply: FakeSpec["eval"], opponentBlunder: FakeSpec["eval"] = cp(-400)): FakeSpec[] => {
      const s = quiet(7);
      s[2] = { eval: cp(20) };
      s[3] = { eval: opponentBlunder };
      s[4] = { eval: afterReply };
      return s;
    };

    it("replaces Mistake/Blunder when the player gives back the opponent's error", () => {
      const moves = classify(RUY, missSpecs(cp(20)));
      expect(moves[2].classification).toBe("blunder");
      expect(moves[3]).toMatchObject({ classification: "miss", baseClassification: "blunder" });
    });

    it("keeps the base label when part of the advantage is kept", () => {
      expect(classify(RUY, missSpecs(cp(-200)))[3].classification).toBe("mistake");
    });

    it("is not given when the player stays completely winning", () => {
      expect(classify(RUY, missSpecs(cp(-1000), mate(-2)))[3].classification).not.toBe("miss");
    });
  });

  it("is deterministic", () => {
    const specs = quiet(7).map((s, i) => ({ ...s, eval: cp((i * 37) % 200 - 100) }));
    expect(classify(RUY, specs)).toEqual(classify(RUY, specs));
  });

  it("rejects a position list of the wrong length", () => {
    expect(() => classifyMoves(RUY.moves, fakePositions(RUY, quiet(7)).slice(1))).toThrow();
  });
});
