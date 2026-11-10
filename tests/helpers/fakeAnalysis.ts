import type { EngineLine, Score } from "@/lib/engine/types";
import type { PositionAnalysis } from "@/lib/analysis/types";
import type { ParsedGame } from "@/lib/pgn/types";

export const cp = (value: number): Score => ({ type: "cp", value });
export const mate = (value: number): Score => ({ type: "mate", value });

export interface FakeSpec {
  /** White-POV evaluation of the position. */
  eval: Score;
  /** Engine best move (UCI). Defaults to "a1a1" (never matches a played move). */
  best?: string;
  /** White-POV score of MultiPV line 2. */
  second?: Score;
  secondMove?: string;
  /** PV after the best move (UCI), used by sacrifice detection of the move INTO this position. */
  pv?: string[];
}

/** Builds hand-made PositionAnalysis objects for a parsed game (White POV), one per position. */
export function fakePositions(game: ParsedGame, specs: FakeSpec[]): PositionAnalysis[] {
  const fens = [game.startFen, ...game.moves.map((m) => m.fenAfter)];
  if (specs.length !== fens.length) throw new Error(`need ${fens.length} specs, got ${specs.length}`);
  return fens.map((fen, ply) => {
    const s = specs[ply];
    const best = s.best ?? "a1a1";
    const lines: EngineLine[] = [{ multiPv: 1, depth: 20, score: s.eval, pv: [best, ...(s.pv ?? [])] }];
    if (s.second) lines.push({ multiPv: 2, depth: 20, score: s.second, pv: [s.secondMove ?? "h8h8"] });
    return {
      ply,
      fen,
      sideToMove: fen.split(" ")[1] as "w" | "b",
      evaluation: s.eval,
      bestMove: best,
      lines,
      depth: 20,
      source: "engine",
    };
  });
}
