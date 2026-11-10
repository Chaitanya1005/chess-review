import { Chess, type Square } from "chess.js";
import type { Color } from "../engine/types";

export const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Material of `color` minus material of the opponent, in pawns. */
export function materialBalance(fen: string, color: Color): number {
  const board = fen.split(" ")[0];
  let balance = 0;
  for (const ch of board) {
    const lower = ch.toLowerCase();
    const value = PIECE_VALUES[lower];
    if (value === undefined) continue;
    const pieceColor: Color = ch === lower ? "b" : "w";
    balance += pieceColor === color ? value : -value;
  }
  return balance;
}

/** Counts N, B, R, Q of both sides. */
export function countMajorsMinors(fen: string): number {
  return [...fen.split(" ")[0]].filter((c) => "nbrqNBRQ".includes(c)).length;
}

/** Number of `color`'s non-pawn, non-king pieces on its own back rank. */
export function backRankPieces(fen: string, color: Color): number {
  const ranks = fen.split(" ")[0].split("/");
  const rank = color === "w" ? ranks[7] : ranks[0];
  const pieces = color === "w" ? "NBRQ" : "nbrq";
  return [...rank].filter((c) => pieces.includes(c)).length;
}

/** Plays a UCI move on a Chess instance; returns the move or null if illegal. */
export function playUci(chess: Chess, uci: string) {
  try {
    return chess.move({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci[4] });
  } catch {
    return null;
  }
}

/** Converts a UCI line to SAN starting from `fen`; stops at the first illegal move. */
export function uciLineToSan(fen: string, line: string[]): string[] {
  const chess = new Chess(fen);
  const out: string[] = [];
  for (const uci of line) {
    const move = playUci(chess, uci);
    if (!move) break;
    out.push(move.san);
  }
  return out;
}
