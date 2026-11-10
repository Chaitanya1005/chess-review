import type { Color, EngineLine, Score, Wdl } from "../engine/types";
import type { ParsedGame } from "../pgn/types";

export type TerminalState = "checkmate" | "stalemate" | "insufficient";

/** Engine analysis of one position. All scores are White POV (docs/DECISIONS.md D-006). */
export interface PositionAnalysis {
  /** 0 = starting position; i = position after ply i. */
  ply: number;
  fen: string;
  sideToMove: Color;
  terminal?: TerminalState;
  evaluation: Score;
  wdl?: Wdl;
  /** Engine best move in UCI, absent for terminal positions. */
  bestMove?: string;
  /** MultiPV lines, sorted by multiPv, White POV. Empty for terminal positions. */
  lines: EngineLine[];
  depth: number;
  source: "engine" | "cache" | "rules";
}

export interface AnalysisSettings {
  engine: string;
  depth: number;
  multiPv: number;
}

export interface GameAnalysis {
  game: ParsedGame;
  /** Length = game.moves.length + 1. */
  positions: PositionAnalysis[];
  settings: AnalysisSettings;
  durationMs: number;
}
