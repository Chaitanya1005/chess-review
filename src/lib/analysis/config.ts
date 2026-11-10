/**
 * All tunable analysis parameters, versioned (docs/ANALYSIS_ENGINE.md §13).
 * Changing any value: bump `version`, add a docs/DECISIONS.md entry, re-run the benchmark.
 */
export const REVIEW_CONFIG = {
  version: "cls-v1",
  expectedPoints: {
    /** Lichess-published logistic coefficient (lichess.org/page/accuracy). */
    k: 0.00368208,
    /** [OURS] centipawns are clamped before the curve. */
    cpClamp: 1000,
  },
  /** Upper bounds (inclusive) of expected points lost, from Chess.com's public table. */
  thresholds: { excellent: 0.02, good: 0.05, inaccuracy: 0.1, mistake: 0.2 },
  great: {
    onlyMoveGap: 0.15,
    maxSecondEP: 0.9,
    excludeForcedMate: true,
    excludeCaptureOfLastMoved: true,
    excludeCheckResponses: true,
  },
  brilliant: { maxLoss: 0.02, minEPAfter: 0.45, maxEPWithout: 0.95, sacrificeMinValue: 2, sacrificePvPlies: 6 },
  miss: { opportunityGain: 0.1, minLoss: 0.1, giveBackMargin: 0.05, stillWinningEP: 0.95 },
  accuracy: { harmonicFloor: 1, minWindow: 2, maxWindow: 8, minWeight: 0.5, maxWeight: 12 },
  phases: { openingMaxPly: 30, middlegameMaxPieces: 10, endgameMaxPieces: 6, sparseBackRank: 4 },
  rating: {
    calibrated: false,
    min: 100,
    max: 3200,
    /**
     * [OURS, PLACEHOLDER] accuracy → rating seed table. NOT fitted to any data.
     * Phase 4 replaces it with a table fitted to benchmark games (docs/DECISIONS.md D-012).
     */
    table: [
      [0, 100],
      [40, 400],
      [55, 800],
      [65, 1100],
      [75, 1500],
      [85, 1900],
      [92, 2300],
      [97, 2700],
      [100, 3000],
    ] as [accuracy: number, rating: number][],
  },
} as const;

export type ReviewConfig = typeof REVIEW_CONFIG;
