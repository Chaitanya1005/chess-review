import { describe, expect, it } from "vitest";
import { describeMaterial, explainMove, lineMaterial } from "@/lib/review/explainMove";
import type { GameReview } from "@/lib/review/buildReview";
import type { GameAnalysis } from "@/lib/analysis/types";
import fixture from "./fixtures/opera-review.json";

// Frozen depth-16 engine output for the Opera Game (npm run analyze -- … --out), so these tests
// need no engine and are deterministic.
const analysis = fixture.analysis as unknown as GameAnalysis;
const review = fixture.review as unknown as GameReview;

function explain(san: string, moveNumber: number) {
  const i = review.moves.findIndex((m) => m.san === san && m.moveNumber === moveNumber);
  expect(i).toBeGreaterThanOrEqual(0);
  return { move: review.moves[i], text: explainMove(review.moves[i], analysis.game.moves[i].fenBefore, review.moves[i - 1]).join(" ") };
}

describe("explainMove on the Opera Game (frozen analysis)", () => {
  it("explains the queen sacrifice 16.Qb8+ as a sound sacrifice that forces mate", () => {
    const { move, text } = explain("Qb8+", 16);
    expect(move.classification).toBe("brilliant");
    expect(text).toContain("gives up the queen");
    expect(text).toContain("forces mate in 1");
  });

  it("says checkmate for 17.Rd8#", () => {
    expect(explain("Rd8#", 17).text).toBe("Checkmate. The game is over.");
  });

  it("names the better move and the material lost for 6...Nf6", () => {
    const { move, text } = explain("Nf6", 6);
    expect(move.classification).toBe("mistake");
    expect(text).toContain("Qf6 was better.");
    expect(text).toContain("This loses a pawn.");
    expect(text).toMatch(/expected score drops from \d+% to \d+%/);
  });

  it("reports an allowed forced mate (15...Nxd7)", () => {
    expect(explain("Nxd7", 15).text).toContain("This allows a forced mate in 2.");
  });

  it("explains the only move 14.Rd1 as keeping the advantage", () => {
    const { move, text } = explain("Rd1", 14);
    expect(move.classification).toBe("great");
    expect(text).toMatch(/^The only move that keeps your advantage/);
  });

  it("gives every move at least one sentence and is deterministic", () => {
    review.moves.forEach((m, i) => {
      const a = explainMove(m, analysis.game.moves[i].fenBefore, review.moves[i - 1]);
      const b = explainMove(m, analysis.game.moves[i].fenBefore, review.moves[i - 1]);
      expect(a.length).toBeGreaterThan(0);
      expect(a).toEqual(b);
    });
  });
});

describe("lineMaterial", () => {
  it("counts material won on the line", () => {
    // 3.Nxh4 wins the queen that Black left on h4.
    const hanging = "rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3";
    const r = lineMaterial(hanging, ["Nxh4"], "w");
    expect(r.net).toBe(9);
    expect(r.gained).toEqual(["q"]);
    expect(lineMaterial(hanging, [], "w").net).toBe(0);
  });

  it("stops at an illegal move", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(lineMaterial(start, ["e4", "Qxh7"], "w").net).toBe(0);
  });

  it("includes the recapture after an exchange", () => {
    // 1.Bxc6 dxc6: bishop for knight, net 0 for White.
    const fen = "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
    const r = lineMaterial(fen, ["Bxc6", "dxc6"], "w");
    expect(r.net).toBe(0);
    expect(r.lost).toEqual(["b"]);
    expect(r.gained).toEqual(["n"]);
  });
});

describe("describeMaterial", () => {
  it.each([
    [9, ["q"], "the queen"],
    [5, ["r"], "a rook"],
    [2, ["r"], "the exchange"],
    [3, ["n"], "a knight"],
    [3, ["b", "p"], "a bishop"],
    [1, ["p"], "a pawn"],
    [2, ["p", "p"], "two pawns"],
    [3, ["p", "p", "p"], "three pawns"],
    [7, ["r", "p", "p"], "a rook"],
    [6, ["b", "n"], "6 points of material"],
  ])("%d pawns of %j → %s", (amount, pieces, expected) => {
    expect(describeMaterial(amount, pieces)).toBe(expected);
  });
});
