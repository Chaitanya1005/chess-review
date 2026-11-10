import { REVIEW_CONFIG, type ReviewConfig } from "./config";
import { backRankPieces, countMajorsMinors } from "./material";

export type GamePhase = "opening" | "middlegame" | "endgame";
export const GAME_PHASES: GamePhase[] = ["opening", "middlegame", "endgame"];

/**
 * Phase of each position (docs/ANALYSIS_ENGINE.md §10). [OURS], inspired by the Lichess "Divider" idea.
 * `fens[i]` is the position after ply i; phases never go backwards.
 */
export function positionPhases(fens: string[], cfg: ReviewConfig = REVIEW_CONFIG): GamePhase[] {
  const p = cfg.phases;
  let phase: GamePhase = "opening";
  return fens.map((fen, ply) => {
    const pieces = countMajorsMinors(fen);
    if (phase !== "endgame" && pieces <= p.endgameMaxPieces) phase = "endgame";
    if (
      phase === "opening" &&
      (pieces <= p.middlegameMaxPieces ||
        backRankPieces(fen, "w") < p.sparseBackRank ||
        backRankPieces(fen, "b") < p.sparseBackRank ||
        ply > p.openingMaxPly)
    ) {
      phase = "middlegame";
    }
    return phase;
  });
}

/** Phase of each move = phase of the position before it. */
export function movePhases(fens: string[], cfg?: ReviewConfig): GamePhase[] {
  return positionPhases(fens, cfg).slice(0, -1);
}
