import { describe, expect, it } from "vitest";
import { capturedPieces } from "@/lib/review/capturedPieces";
import { areaPath, graphValues, linePoints, plyToX, valueToY, xToPly } from "@/lib/review/evalGraph";
import { formatLine } from "@/lib/review/formatLine";
import { initialViewState, keyToAction, reviewViewReducer } from "@/lib/review/navigation";
import { ANALYSIS_PRESETS, presetById } from "@/lib/review/presets";
import { CLASSIFICATION_INFO } from "@/lib/review/classificationInfo";
import { CLASSIFICATIONS } from "@/lib/analysis/moveClassification";
import { checkPgnFile, looksBinary } from "@/lib/pgn/fileCheck";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("capturedPieces", () => {
  it("is empty at the start", () => {
    const c = capturedPieces(START);
    expect(c.captured).toEqual({ w: [], b: [] });
    expect(c.advantage).toEqual({ w: 0, b: 0 });
  });

  it("lists captures most valuable first with the material difference", () => {
    // White is missing a pawn; Black is missing its queen and a knight.
    const fen = "r1b1kbnr/pppppppp/8/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1";
    const c = capturedPieces(fen);
    expect(c.captured.w).toEqual(["q", "n"]);
    expect(c.captured.b).toEqual(["p"]);
    expect(c.advantage).toEqual({ w: 11, b: 0 });
  });

  it("treats a promoted piece as a former pawn (never a negative capture)", () => {
    // White has two queens and seven pawns: one pawn promoted.
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPP1/RNBQKBNQ w Qkq - 0 1";
    const c = capturedPieces(fen);
    expect(c.captured.b).toEqual(["r"]);
    expect(c.advantage.w).toBe(3); // 42 vs 39: extra queen (+9), one rook (−5) and one pawn (−1) fewer
  });
});

describe("evalGraph", () => {
  const g = { width: 300, height: 100 };

  it("maps evaluations to White expected score with mate at the edges", () => {
    const v = graphValues([
      { type: "cp", value: 0 },
      { type: "cp", value: 300 },
      { type: "mate", value: 3 },
      { type: "mate", value: -2 },
      { type: "mate", value: 0, winner: "b" },
    ]);
    expect(v[0]).toBeCloseTo(50);
    expect(v[1]).toBeGreaterThan(70);
    expect(v[1]).toBeLessThan(100);
    expect(v.slice(2)).toEqual([100, 0, 0]);
  });

  it("converts between plies and x coordinates", () => {
    expect(plyToX(0, 31, g)).toBe(0);
    expect(plyToX(30, 31, g)).toBe(300);
    for (let ply = 0; ply < 31; ply++) expect(xToPly(plyToX(ply, 31, g), 31, g)).toBe(ply);
    expect(xToPly(-50, 31, g)).toBe(0);
    expect(xToPly(999, 31, g)).toBe(30);
    expect(xToPly(10, 1, g)).toBe(0);
  });

  it("puts 100% at the top and 0% at the bottom", () => {
    expect(valueToY(100, g)).toBe(0);
    expect(valueToY(0, g)).toBe(100);
    expect(valueToY(50, g)).toBe(50);
    expect(valueToY(150, g)).toBe(0);
  });

  it("builds a closed area path and a polyline", () => {
    expect(areaPath([50, 100, 0], g)).toBe("M0,100 L0,50 L150,0 L300,100 L300,100 Z");
    expect(linePoints([50, 100], g)).toBe("0,50 300,0");
    expect(areaPath([], g)).toBe("");
  });
});

describe("review navigation", () => {
  it("clamps to the game and flips the board", () => {
    let s = initialViewState(10);
    s = reviewViewReducer(s, { type: "prev" });
    expect(s.ply).toBe(0);
    s = reviewViewReducer(s, { type: "last" });
    expect(s.ply).toBe(10);
    s = reviewViewReducer(s, { type: "next" });
    expect(s.ply).toBe(10);
    s = reviewViewReducer(s, { type: "select", ply: 4 });
    expect(s.ply).toBe(4);
    s = reviewViewReducer(s, { type: "select", ply: 99 });
    expect(s.ply).toBe(10);
    s = reviewViewReducer(s, { type: "select", ply: Number.NaN });
    expect(s.ply).toBe(10);
    s = reviewViewReducer(s, { type: "flip" });
    expect(s.orientation).toBe("b");
    expect(reviewViewReducer(s, { type: "first" }).ply).toBe(0);
  });

  it("maps keyboard keys", () => {
    expect(keyToAction("ArrowLeft")).toEqual({ type: "prev" });
    expect(keyToAction("ArrowRight")).toEqual({ type: "next" });
    expect(keyToAction("Home")).toEqual({ type: "first" });
    expect(keyToAction("End")).toEqual({ type: "last" });
    expect(keyToAction("f")).toEqual({ type: "flip" });
    expect(keyToAction("x")).toBeUndefined();
  });
});

describe("formatLine", () => {
  it("numbers lines from White and from Black", () => {
    expect(formatLine(["e4", "e5", "Nf3"], 1, "w")).toBe("1. e4 e5 2. Nf3");
    expect(formatLine(["Nxb8", "Rd8#"], 16, "b")).toBe("16... Nxb8 17. Rd8#");
    expect(formatLine([], 1, "w")).toBe("");
  });
});

describe("presets and classification info", () => {
  it("defaults to the standard preset for unknown ids", () => {
    expect(presetById(undefined).id).toBe("standard");
    expect(presetById("nope").depth).toBe(16);
    expect(ANALYSIS_PRESETS.map((p) => p.depth)).toEqual([12, 16, 18]);
  });

  it("has a label, symbol and colour for every classification", () => {
    for (const c of CLASSIFICATIONS) {
      const info = CLASSIFICATION_INFO[c];
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.symbol.length).toBeGreaterThan(0);
      expect(info.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("PGN file checks", () => {
  it("rejects large and non-text files and accepts PGNs", () => {
    expect(checkPgnFile({ name: "game.pgn", size: 2_000_000, type: "" })).toMatch(/larger than 1 MB/);
    expect(checkPgnFile({ name: "photo.png", size: 1000, type: "image/png" })).toMatch(/does not look like a PGN/);
    expect(checkPgnFile({ name: "game.pgn", size: 1000, type: "" })).toBeNull();
    expect(checkPgnFile({ name: "export", size: 1000, type: "application/x-chess-pgn" })).toBeNull();
    expect(checkPgnFile({ name: "notes.txt", size: 10, type: "text/plain" })).toBeNull();
    expect(looksBinary("1. e4\u0000")).toBe(true);
    expect(looksBinary("1. e4 e5")).toBe(false);
  });
});
