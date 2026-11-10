import { describe, expect, it } from "vitest";
import { isUciMove, parseBestMove, parseInfoLine } from "@/lib/engine/uci";

describe("parseInfoLine", () => {
  it("parses a full Stockfish info line with WDL and PV", () => {
    const info = parseInfoLine(
      "info depth 12 seldepth 19 multipv 1 score cp -27 wdl 6 942 52 nodes 40763 nps 1019075 hashfull 13 time 40 pv g8f6 b1c3 b8c6",
    );
    expect(info).toEqual({
      depth: 12,
      seldepth: 19,
      multiPv: 1,
      score: { type: "cp", value: -27 },
      bound: undefined,
      wdl: [6, 942, 52],
      nodes: 40763,
      nps: 1019075,
      timeMs: 40,
      pv: ["g8f6", "b1c3", "b8c6"],
    });
  });

  it("parses mate scores and bounds", () => {
    expect(parseInfoLine("info depth 5 multipv 2 score mate -3 upperbound nodes 10 pv e1e2")).toMatchObject({
      multiPv: 2,
      score: { type: "mate", value: -3 },
      bound: "upper",
    });
  });

  it("defaults multipv to 1", () => {
    expect(parseInfoLine("info depth 1 score cp 10 pv e2e4")?.multiPv).toBe(1);
  });

  it("ignores lines without score or pv", () => {
    expect(parseInfoLine("info string NNUE evaluation using nn-xyz.nnue")).toBeNull();
    expect(parseInfoLine("info depth 10 currmove e2e4 currmovenumber 1")).toBeNull();
    expect(parseInfoLine("info depth 0 score mate 0")).toBeNull();
    expect(parseInfoLine("bestmove e2e4")).toBeNull();
  });
});

describe("parseBestMove", () => {
  it("parses bestmove with and without ponder", () => {
    expect(parseBestMove("bestmove g8f6 ponder b1c3")).toEqual({ bestMove: "g8f6", ponder: "b1c3" });
    expect(parseBestMove("bestmove e7e8q")).toEqual({ bestMove: "e7e8q", ponder: undefined });
  });
  it("maps (none) to null", () => {
    expect(parseBestMove("bestmove (none)")?.bestMove).toBeNull();
  });
  it("returns undefined for other lines", () => {
    expect(parseBestMove("readyok")).toBeUndefined();
  });
});

describe("isUciMove", () => {
  it("accepts UCI moves and rejects others", () => {
    expect(isUciMove("e2e4")).toBe(true);
    expect(isUciMove("a7a8q")).toBe(true);
    expect(isUciMove("e4")).toBe(false);
    expect(isUciMove("(none)")).toBe(false);
  });
});
