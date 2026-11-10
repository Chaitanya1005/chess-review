import type { Color } from "../engine/types";

export type GameResult = "1-0" | "0-1" | "1/2-1/2" | "*";

export interface ParsedMove {
  /** 1-based half-move index within this game. */
  ply: number;
  /** Full-move number as printed in the PGN (accounts for a custom start FEN). */
  moveNumber: number;
  color: Color;
  san: string;
  /** UCI notation: e2e4, e7e8q. */
  uci: string;
  from: string;
  to: string;
  piece: string;
  captured?: string;
  promotion?: string;
  fenBefore: string;
  fenAfter: string;
}

export interface ParsedGame {
  headers: Record<string, string>;
  startFen: string;
  moves: ParsedMove[];
  result: GameResult;
  /** Non-fatal notes for the user, e.g. "only the first of 3 games was used". */
  warnings: string[];
}

export type PgnErrorCode =
  | "empty"
  | "too-large"
  | "unsupported-variant"
  | "invalid-fen"
  | "illegal-move"
  | "no-moves"
  | "parse-error";

export class PgnError extends Error {
  constructor(
    message: string,
    readonly code: PgnErrorCode,
  ) {
    super(message);
    this.name = "PgnError";
  }
}
