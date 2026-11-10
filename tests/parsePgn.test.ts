import { describe, expect, it } from "vitest";
import { parsePgn } from "@/lib/pgn/parsePgn";
import { PgnError } from "@/lib/pgn/types";
import { SCHOLARS_MATE, OPERA_GAME } from "./fixtures/games";

function expectPgnError(fn: () => unknown, code: string, message?: RegExp) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(PgnError);
    expect((error as PgnError).code).toBe(code);
    if (message) expect((error as PgnError).message).toMatch(message);
    return;
  }
  throw new Error("expected a PgnError");
}

describe("parsePgn", () => {
  it("parses headers, moves, FENs and result", () => {
    const game = parsePgn(SCHOLARS_MATE);
    expect(game.headers.White).toBe("Alice");
    expect(game.result).toBe("1-0");
    expect(game.moves.map((m) => m.san)).toEqual(["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"]);
    expect(game.moves.map((m) => m.uci)).toEqual(["e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g8f6", "h5f7"]);
    expect(game.moves[6]).toMatchObject({ ply: 7, moveNumber: 4, color: "w", captured: "p" });
    // Positions chain: each move starts where the previous one ended.
    for (let i = 1; i < game.moves.length; i++) {
      expect(game.moves[i].fenBefore).toBe(game.moves[i - 1].fenAfter);
    }
    expect(game.startFen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  });

  it("ignores comments, NAGs and variations, keeping the mainline", () => {
    const game = parsePgn(OPERA_GAME);
    expect(game.moves).toHaveLength(33);
    expect(game.moves.at(-1)?.san).toBe("Rd8#");
  });

  it("handles promotions in UCI", () => {
    const game = parsePgn('[SetUp "1"]\n[FEN "8/4P1k1/8/8/8/8/8/4K3 w - - 0 1"]\n\n1. e8=Q *');
    expect(game.moves[0].uci).toBe("e7e8q");
    expect(game.moves[0].promotion).toBe("q");
    expect(game.result).toBe("*");
  });

  it("supports a custom start FEN with Black to move", () => {
    const game = parsePgn('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 b - - 0 12"]\n\n12... Kd7 13. e4 *');
    expect(game.startFen).toBe("4k3/8/8/8/8/8/4P3/4K3 b - - 0 12");
    expect(game.moves.map((m) => [m.color, m.moveNumber])).toEqual([
      ["b", 12],
      ["w", 13],
    ]);
  });

  it("uses the first game and warns when several are given", () => {
    const game = parsePgn(`${SCHOLARS_MATE}\n\n${OPERA_GAME}`);
    expect(game.moves).toHaveLength(7);
    expect(game.warnings[0]).toMatch(/2 games/);
  });

  it("accepts movetext without headers and Windows line endings", () => {
    const game = parsePgn("1. d4 d5\r\n2. c4 e6 *\r\n");
    expect(game.moves).toHaveLength(4);
  });

  it("reports the move number of an illegal move", () => {
    expectPgnError(() => parsePgn("1. e4 e5 2. Nf3 Qh4 3. Nxh4 Kxh5"), "illegal-move", /3\.\.\. Kxh5/);
    expectPgnError(() => parsePgn("1. e4 e5 2. Ke3"), "illegal-move", /2\. Ke3/);
  });

  it("rejects empty input, no moves, variants and bad FENs", () => {
    expectPgnError(() => parsePgn("   \n "), "empty");
    expectPgnError(() => parsePgn('[Event "x"]\n\n*'), "no-moves");
    expectPgnError(() => parsePgn('[Variant "Chess960"]\n\n1. e4 *'), "unsupported-variant");
    expectPgnError(() => parsePgn('[SetUp "1"]\n[FEN "not a fen"]\n\n1. e4 *'), "invalid-fen");
  });

  it("rejects oversized input", () => {
    expectPgnError(() => parsePgn("1. e4 ".repeat(200_000)), "too-large");
  });
});
