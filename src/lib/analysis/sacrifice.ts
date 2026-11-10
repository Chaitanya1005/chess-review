import { Chess, type Square } from "chess.js";
import type { Color } from "../engine/types";
import { materialBalance, PIECE_VALUES, playUci } from "./material";

export interface SacrificeResult {
  isSacrifice: boolean;
  /** "pv": accepted along the engine line; "static": moved piece left en prise. */
  kind?: "pv" | "static";
  /** Material given up, in pawns (largest deficit seen). */
  value: number;
}

export interface SacrificeOptions {
  minValue: number;
  pvPlies: number;
}

const NONE: SacrificeResult = { isSacrifice: false, value: 0 };

/**
 * Detects a piece sacrifice by the side making `moveUci` from `fenBefore` (docs/ANALYSIS_ENGINE.md §7).
 * `pvAfter` is the engine's best line from the position after the move (opponent to move).
 * [OURS] heuristic, deliberately conservative.
 */
export function detectSacrifice(fenBefore: string, moveUci: string, pvAfter: string[], opts: SacrificeOptions): SacrificeResult {
  const chess = new Chess(fenBefore);
  const mover = chess.turn() as Color;
  const move = playUci(chess, moveUci);
  if (!move) return NONE;

  const movedPiece = move.promotion ?? move.piece;
  const movedValue = PIECE_VALUES[movedPiece];
  const capturedValue = move.captured ? PIECE_VALUES[move.captured] : 0;

  // A capture of equal or greater value is a trade, not a sacrifice (e.g. QxQ, NxB).
  if (capturedValue >= movedValue && movedPiece !== "p") return NONE;

  const alreadyHanging = hangingSquares(fenBefore);
  const pv = acceptedAlongPv(fenBefore, chess.fen(), mover, pvAfter, alreadyHanging, opts);
  if (pv.isSacrifice) return pv;
  return offeredStatically(chess, move.to as Square, movedPiece, capturedValue, mover, opts);
}

/**
 * Squares holding the mover's pieces that the opponent could already capture before the move
 * (computed by passing the move to the opponent). Losing such a piece is not caused by this move.
 */
function hangingSquares(fenBefore: string): Set<string> {
  const parts = fenBefore.split(" ");
  parts[1] = parts[1] === "w" ? "b" : "w";
  parts[3] = "-";
  try {
    const flipped = new Chess(parts.join(" "));
    return new Set(flipped.moves({ verbose: true }).filter((m) => m.captured).map((m) => m.to));
  } catch {
    // The mover is in check, so the opponent cannot "pass"; treat nothing as already hanging.
    return new Set();
  }
}

/**
 * Follows the PV and tracks the mover's material relative to before the move. A sacrifice is a
 * deficit of at least `minValue` that includes a lost non-pawn piece and that still stands after
 * the mover's next move (so ordinary trades such as Bxc3 bxc3 are not counted).
 */
function acceptedAlongPv(
  fenBefore: string,
  fenAfter: string,
  mover: Color,
  pv: string[],
  alreadyHanging: Set<string>,
  opts: SacrificeOptions,
): SacrificeResult {
  const original = new Chess(fenBefore);
  const base = materialBalance(fenBefore, mover);
  const chess = new Chess(fenAfter);
  let lostPiece = false;
  let pendingDeficit = 0;
  let worst = 0;
  let played = 0;
  let lastByOpponent = false;

  for (let i = 0; i < Math.min(pv.length, opts.pvPlies); i++) {
    const move = playUci(chess, pv[i]);
    if (!move) break;
    played++;
    const opponentMoved = move.color !== mover;
    lastByOpponent = opponentMoved;
    if (opponentMoved && move.captured && move.captured !== "p") {
      // Ignore a piece that was standing on that square, already capturable, before the move.
      const stoodThere = original.get(move.to as Square)?.color === mover;
      if (!(stoodThere && alreadyHanging.has(move.to))) lostPiece = true;
    }
    const deficit = base - materialBalance(chess.fen(), mover);

    if (opponentMoved) {
      pendingDeficit = deficit;
    } else if (pendingDeficit >= opts.minValue && deficit >= opts.minValue && lostPiece) {
      // The deficit persisted through the mover's reply.
      worst = Math.max(worst, Math.min(pendingDeficit, deficit));
    }
  }
  // The whole PV fitted in the window and ended right after the opponent took the material
  // (e.g. the engine's line stops there): the deficit stands.
  const pvEndedInWindow = played === pv.length && pv.length <= opts.pvPlies;
  if (pvEndedInWindow && lastByOpponent && pendingDeficit >= opts.minValue && lostPiece) {
    worst = Math.max(worst, pendingDeficit);
  }
  return worst >= opts.minValue ? { isSacrifice: true, kind: "pv", value: worst } : NONE;
}

/** The moved (non-pawn, non-king) piece stands attacked and is undefended or attacked by a cheaper piece. */
function offeredStatically(
  chessAfter: Chess,
  square: Square,
  piece: string,
  capturedValue: number,
  mover: Color,
  opts: SacrificeOptions,
): SacrificeResult {
  if (piece === "p" || piece === "k") return NONE;
  const value = PIECE_VALUES[piece];
  if (value < opts.minValue) return NONE;
  const opponent: Color = mover === "w" ? "b" : "w";
  const attackers = chessAfter.attackers(square, opponent);
  if (attackers.length === 0) return NONE;
  // Only count attackers that can legally capture.
  const legalCaptures = chessAfter.moves({ verbose: true }).filter((m) => m.to === square);
  if (legalCaptures.length === 0) return NONE;
  const defended = chessAfter.attackers(square, mover).length > 0;
  const cheapest = Math.min(...legalCaptures.map((m) => PIECE_VALUES[m.piece]));
  if (!defended || cheapest < value) {
    // Net of anything the move itself captured (e.g. Rxb7 giving the exchange loses 5 − 3 = 2).
    const loss = (defended ? value - cheapest : value) - capturedValue;
    if (loss >= opts.minValue) return { isSacrifice: true, kind: "static", value: loss };
  }
  return NONE;
}
