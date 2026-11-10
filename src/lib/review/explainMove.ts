import { Chess, type Square } from "chess.js";
import type { Color, Score } from "../engine/types";
import { mateWinner } from "../analysis/evaluation";
import { materialBalance, PIECE_VALUES } from "../analysis/material";
import type { MoveReview } from "./buildReview";

/**
 * Deterministic move explanations (FR-EXP-2, FR-EXP-4). Template sentences built only from the
 * review data and the engine lines; no language model. [OURS]
 *
 * Material statements come from replaying the engine's main line a few plies (to the end of any
 * capture sequence), so they describe the engine's continuation, not a proof.
 */

const PIECE_NAMES: Record<string, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

const BAD = new Set(["inaccuracy", "mistake", "blunder", "miss"]);

/** Plies of a line to replay before looking at material; extended while captures continue. */
const LINE_PLIES = 6;
const MAX_EXTENSION = 4;

interface LineMaterial {
  /** Change in the mover's material balance over the line, in pawns. */
  net: number;
  /** Mover's pieces captured on the line. */
  lost: string[];
  /** Opponent's pieces the mover captured on the line. */
  gained: string[];
}

/** Replays a SAN line from `fen` and measures the mover's material change (see LINE_PLIES). */
export function lineMaterial(fen: string, sanLine: string[], mover: Color): LineMaterial {
  const chess = new Chess(fen);
  const played: { color: Color; captured?: string; san: string }[] = [];
  for (const san of sanLine) {
    try {
      const m = chess.move(san);
      played.push({ color: m.color, captured: m.captured, san: m.san });
    } catch {
      break;
    }
  }
  // Stop after the opponent's reply when possible, then follow any capture sequence to its end.
  let cut = Math.min(played.length, LINE_PLIES);
  if (cut > 1 && cut % 2 === 1 && cut < played.length) cut++;
  const limit = Math.min(played.length, LINE_PLIES + MAX_EXTENSION);
  while (cut < limit && played[cut].captured) cut++;

  const replay = new Chess(fen);
  const lost: string[] = [];
  const gained: string[] = [];
  for (const m of played.slice(0, cut)) {
    replay.move(m.san);
    if (!m.captured) continue;
    (m.color === mover ? gained : lost).push(m.captured);
  }
  return { net: materialBalance(replay.fen(), mover) - materialBalance(fen, mover), lost, gained };
}

/** "the queen", "a rook", "the exchange", "a knight", "a pawn", "two pawns". */
export function describeMaterial(amount: number, pieces: string[]): string {
  const has = (role: string) => pieces.includes(role);
  if (amount >= 8 && has("q")) return "the queen";
  if (amount >= 4 && has("r")) return "a rook";
  if (amount >= 2.5 && amount < 4.5) {
    const minor = pieces.find((p) => p === "n" || p === "b");
    if (minor) return `a ${PIECE_NAMES[minor]}`;
    if (amount === 3) return "three pawns";
  }
  if (amount === 2 && has("r")) return "the exchange";
  if (amount === 1) return "a pawn";
  if (amount === 2) return "two pawns";
  return `${amount} points of material`;
}

interface MateInfo {
  winner: Color;
  /** Moves to mate; 0 = already checkmated. */
  moves: number;
}

function mateInfo(score: Score): MateInfo | undefined {
  const winner = mateWinner(score);
  if (score.type !== "mate" || !winner) return undefined;
  return { winner, moves: Math.abs(score.value) };
}

function pct(ep: number): string {
  return `${Math.round(ep * 100)}%`;
}

function movedPiece(fenBefore: string, uci: string): string | undefined {
  try {
    return new Chess(fenBefore).get(uci.slice(0, 2) as Square)?.type;
  } catch {
    return undefined;
  }
}

/**
 * Explains one move in a few sentences.
 * @param fenBefore position before the move
 * @param previous the opponent's move just before this one (for Miss)
 */
export function explainMove(move: MoveReview, fenBefore: string, previous?: MoveReview): string[] {
  const mover = move.color;
  const opponent: Color = mover === "w" ? "b" : "w";
  const best = move.bestMoveSan;
  const out: string[] = [];

  const before = mateInfo(move.evalBefore);
  const after = mateInfo(move.evalAfter);
  if (after && after.moves === 0 && after.winner === mover) return ["Checkmate. The game is over."];

  switch (move.classification) {
    case "brilliant": {
      const role = movedPiece(fenBefore, move.uci);
      const value = move.sacrifice?.value ?? (role ? PIECE_VALUES[role] : 0);
      const what = role && PIECE_VALUES[role] >= value ? `the ${PIECE_NAMES[role]}` : describeMaterial(value, role ? [role] : []);
      out.push(`A sound sacrifice: ${move.san} gives up ${what}, and the engine still rates it as the best or nearly the best move.`);
      break;
    }
    case "great": {
      const what = move.epBefore >= 0.6 ? "keeps your advantage" : "holds the position";
      out.push(
        move.secondBestEP !== undefined
          ? `The only move that ${what}: the engine's next-best move would drop your expected score from ${pct(move.epBefore)} to ${pct(move.secondBestEP)}.`
          : `The only move that ${what}.`,
      );
      break;
    }
    case "best":
      out.push("This is the engine's top choice.");
      break;
    case "excellent":
      out.push(best ? `Nearly as strong as the engine's top choice, ${best}.` : "Nearly as strong as the engine's top choice.");
      break;
    case "good":
      out.push(best ? `A reasonable move, but ${best} was stronger.` : "A reasonable move, but there was a stronger one.");
      break;
    case "miss":
      out.push(
        previous
          ? `After ${previous.san} you had a chance to take advantage, but this move lets it go.${best ? ` ${best} was the way to punish it.` : ""}`
          : `This misses a chance to take advantage.${best ? ` ${best} was stronger.` : ""}`,
      );
      break;
    default:
      if (best) out.push(`${best} was better.`);
  }

  // Forced mates.
  let mateSentence = false;
  if (after && after.winner === opponent && after.moves > 0) {
    out.push(before && before.winner === opponent ? "You were already facing a forced mate." : `This allows a forced mate in ${after.moves}.`);
    mateSentence = true;
  } else if (before && before.winner === mover && before.moves > 0 && !(after && after.winner === mover)) {
    out.push(best ? `${best} would have forced mate in ${before.moves}; this lets it slip.` : `This lets a forced mate slip.`);
    mateSentence = true;
  } else if (after && after.winner === mover && after.moves > 0) {
    out.push(`This forces mate in ${after.moves}.`);
    mateSentence = true;
  }

  // Material, from the engine's main lines (only for moves that were not the engine's choice).
  if (!move.isEngineBest && !mateSentence) {
    const played = lineMaterial(fenBefore, [move.san, ...move.playedLineSan], mover);
    const bestLine = best ? lineMaterial(fenBefore, move.bestLineSan, mover) : undefined;
    if (BAD.has(move.classification) && played.net <= -1) {
      out.push(`This loses ${describeMaterial(-played.net, played.lost)}.`);
    }
    if (bestLine && best && bestLine.net >= 2 && bestLine.net - played.net >= 2) {
      out.push(`You missed winning ${describeMaterial(bestLine.net, bestLine.gained)} with ${best}.`);
    }
  }

  if (BAD.has(move.classification) && move.epLoss > 0) {
    out.push(`Your expected score drops from ${pct(move.epBefore)} to ${pct(move.epAfter)}.`);
  }
  return out;
}
