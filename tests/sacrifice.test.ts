import { describe, expect, it } from "vitest";
import { detectSacrifice } from "@/lib/analysis/sacrifice";
import { parsePgn } from "@/lib/pgn/parsePgn";

const OPTS = { minValue: 2, pvPlies: 6 };
const fenAfter = (pgn: string) => parsePgn(pgn).moves.at(-1)!.fenAfter;

describe("detectSacrifice", () => {
  it("detects an accepted sacrifice along the PV (Greek gift Bxh7+)", () => {
    const fen = "r1bq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R2QK2R w KQ - 0 9";
    const result = detectSacrifice(fen, "d3h7", ["g8h7", "f3g5", "h7g8", "d1h5"], OPTS);
    expect(result).toMatchObject({ isSacrifice: true, value: 2 });
  });

  it("does not count an ordinary trade (Nc3 Bxc3+ bxc3)", () => {
    const fen = fenAfter("1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Bb4+");
    expect(detectSacrifice(fen, "b1c3", ["b4c3", "b2c3", "g8f6"], OPTS).isSacrifice).toBe(false);
  });

  it("does not count an equal capture (QxQ)", () => {
    const fen = fenAfter("1. d4 d5 2. c4 dxc4 3. e3 e5 4. dxe5");
    expect(detectSacrifice(fen, "d8d1", ["e1d1"], OPTS).isSacrifice).toBe(false);
  });

  it("detects a piece left en prise statically (Qh5 attacked by the g6 pawn)", () => {
    const fen = fenAfter("1. e4 g6");
    expect(detectSacrifice(fen, "d1h5", [], OPTS)).toMatchObject({ isSacrifice: true, kind: "static", value: 9 });
  });

  it("does not count losing a piece that was already hanging before the move", () => {
    // White's Ng5 is already attacked by the queen on d8; 4.a3 does not cause its loss.
    const fen = fenAfter("1. e4 e5 2. Nf3 Nc6 3. Ng5 a6");
    expect(detectSacrifice(fen, "a2a3", ["d8g5", "d2d4", "g5g6"], OPTS).isSacrifice).toBe(false);
    // Actively giving that knight for a pawn on f7 (only the king can take back) is a sacrifice: 3 − 1 = 2.
    expect(detectSacrifice(fen, "g5f7", [], OPTS)).toMatchObject({ isSacrifice: true, kind: "static", value: 2 });
  });

  it("nets out material the move captured", () => {
    // Rxb3 takes a knight, then the a4 pawn takes the rook: an exchange sacrifice, 5 − 3 = 2.
    expect(detectSacrifice("4k3/8/8/8/p7/1n6/8/1R2K3 w - - 0 1", "b1b3", [], OPTS)).toMatchObject({
      isSacrifice: true,
      kind: "static",
      value: 2,
    });
    // Bxb3 (3 for 3) is a trade.
    expect(detectSacrifice("4k3/8/8/8/p7/1n6/8/3BK3 w - - 0 1", "d1b3", [], OPTS).isSacrifice).toBe(false);
  });

  it("ignores pawn moves and quiet safe moves", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(detectSacrifice(start, "e2e4", ["e7e5"], OPTS).isSacrifice).toBe(false);
    expect(detectSacrifice(start, "g1f3", ["g8f6"], OPTS).isSacrifice).toBe(false);
  });

  it("returns no sacrifice for an illegal move", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(detectSacrifice(start, "e2e5", [], OPTS).isSacrifice).toBe(false);
  });
});
