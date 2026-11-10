import type { Color, Score } from "../engine/types";
import { REVIEW_CONFIG } from "./config";
import { mateWinner } from "./evaluation";

type EpConfig = { k: number; cpClamp: number };

/**
 * Expected points for White in [0, 1] from a White-POV score (docs/ANALYSIS_ENGINE.md §5).
 * Logistic curve published by Lichess; rating-independent approximation (D-009).
 */
export function expectedPointsWhite(score: Score, cfg: EpConfig = REVIEW_CONFIG.expectedPoints): number {
  if (score.type === "mate") return mateWinner(score) === "w" ? 1 : 0;
  const cp = Math.max(-cfg.cpClamp, Math.min(cfg.cpClamp, score.value));
  return 1 / (1 + Math.exp(-cfg.k * cp));
}

/** Expected points for `color` from a White-POV score. */
export function expectedPoints(score: Score, color: Color, cfg?: EpConfig): number {
  const white = expectedPointsWhite(score, cfg);
  return color === "w" ? white : 1 - white;
}

/** Win% (0–100) for `color`; Lichess's scale. */
export function winPercent(score: Score, color: Color, cfg?: EpConfig): number {
  return 100 * expectedPoints(score, color, cfg);
}

/** True when two White-POV scores are identical (used for "equal to the best line"). */
export function sameScore(a: Score, b: Score): boolean {
  if (a.type !== b.type || a.value !== b.value) return false;
  return a.type === "cp" || mateWinner(a) === mateWinner(b);
}
