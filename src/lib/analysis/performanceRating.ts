import { REVIEW_CONFIG, type ReviewConfig } from "./config";

export interface RatingEstimate {
  value: number;
  /** False until the table is fitted to benchmark data (docs/DECISIONS.md D-012). */
  calibrated: boolean;
}

/**
 * Estimated game performance rating from game accuracy (docs/ANALYSIS_ENGINE.md §9).
 * [OURS, provisional] monotonic piecewise-linear interpolation; never an Elo/FIDE/Chess.com rating.
 */
export function estimateRating(accuracy: number | null, cfg: ReviewConfig = REVIEW_CONFIG): RatingEstimate | null {
  if (accuracy === null || !Number.isFinite(accuracy)) return null;
  const table = cfg.rating.table;
  const x = Math.min(100, Math.max(0, accuracy));
  let value = table[table.length - 1][1];
  for (let i = 1; i < table.length; i++) {
    const [x0, y0] = table[i - 1];
    const [x1, y1] = table[i];
    if (x <= x1) {
      value = y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
      break;
    }
  }
  const clamped = Math.min(cfg.rating.max, Math.max(cfg.rating.min, value));
  return { value: Math.round(clamped / 50) * 50, calibrated: cfg.rating.calibrated };
}
