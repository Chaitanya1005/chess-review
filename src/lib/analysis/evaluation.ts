import type { Color, EngineLine, Score, Wdl } from "../engine/types";

/**
 * Converts a side-to-move score (UCI) to White's perspective.
 * This is the ONLY place where side-to-move sign handling happens (docs/DECISIONS.md D-006).
 */
export function toWhitePov(score: Score, sideToMove: Color): Score {
  if (score.type === "mate" && score.value === 0) {
    // UCI `mate 0`: the side to move is checkmated.
    return { type: "mate", value: 0, winner: sideToMove === "w" ? "b" : "w" };
  }
  const sign = sideToMove === "w" ? 1 : -1;
  return score.type === "cp" ? { type: "cp", value: sign * score.value + 0 } : { type: "mate", value: sign * score.value };
}

export function wdlToWhitePov(wdl: Wdl, sideToMove: Color): Wdl {
  return sideToMove === "w" ? wdl : [wdl[2], wdl[1], wdl[0]];
}

export function lineToWhitePov(line: EngineLine, sideToMove: Color): EngineLine {
  return {
    ...line,
    score: toWhitePov(line.score, sideToMove),
    wdl: line.wdl ? wdlToWhitePov(line.wdl, sideToMove) : undefined,
  };
}

/** Who is being mated, if this is a mate score; undefined for cp scores. White POV input. */
export function mateWinner(score: Score): Color | undefined {
  if (score.type !== "mate") return undefined;
  if (score.value > 0) return "w";
  if (score.value < 0) return "b";
  return score.winner;
}

/** Score of a checkmated position in White POV. */
export function checkmatedScore(sideToMove: Color): Score {
  return { type: "mate", value: 0, winner: sideToMove === "w" ? "b" : "w" };
}

/** Human-readable score, White POV: "+0.4", "-1.2", "M3", "-M3", "1-0". */
export function formatScore(score: Score): string {
  if (score.type === "cp") {
    const pawns = score.value / 100;
    return `${pawns > 0 ? "+" : ""}${pawns.toFixed(1)}`;
  }
  if (score.value === 0) return score.winner === "w" ? "1-0" : "0-1";
  return score.value > 0 ? `M${score.value}` : `-M${-score.value}`;
}
