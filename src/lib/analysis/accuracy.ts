import type { Color, Score } from "../engine/types";
import { REVIEW_CONFIG, type ReviewConfig } from "./config";
import { expectedPointsWhite } from "./expectedPoints";

/**
 * Accuracy of one move from the mover's Win% before and after (docs/ANALYSIS_ENGINE.md §8).
 * Constants are Lichess's published curve fit [LICHESS-PUBLIC].
 */
export function moveAccuracy(winBefore: number, winAfter: number): number {
  if (winAfter >= winBefore) return 100;
  const drop = winBefore - winAfter;
  const raw = 103.1668100711649 * Math.exp(-0.04354415386753951 * drop) - 3.166924740191411;
  return clamp(raw + 1, 0, 100);
}

export interface AccuracyInput {
  /** White-POV evaluation of each position, start position first. */
  evaluations: Score[];
  /** Mover of each move (length = evaluations.length − 1). */
  movers: Color[];
}

export interface MoveAccuracy {
  accuracy: number;
  /** Volatility weight of the move's window. */
  weight: number;
}

/** Per-move accuracies and volatility weights for every move of the game. */
export function moveAccuracies(input: AccuracyInput, cfg: ReviewConfig = REVIEW_CONFIG): MoveAccuracy[] {
  const n = input.movers.length;
  if (input.evaluations.length !== n + 1) throw new Error("evaluations must have one more entry than movers");
  if (n === 0) return [];
  const a = cfg.accuracy;
  const whiteWin = input.evaluations.map((s) => 100 * expectedPointsWhite(s, cfg.expectedPoints));

  // Window size from game length; the first moves reuse the first window [LICHESS-PUBLIC method].
  const windowSize = Math.min(whiteWin.length, clamp(Math.floor(n / 10), a.minWindow, a.maxWindow));
  const weights: number[] = [];
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, Math.min(i - windowSize + 2, whiteWin.length - windowSize));
    weights.push(clamp(standardDeviation(whiteWin.slice(start, start + windowSize)), a.minWeight, a.maxWeight));
  }

  return input.movers.map((color, i) => {
    const before = color === "w" ? whiteWin[i] : 100 - whiteWin[i];
    const after = color === "w" ? whiteWin[i + 1] : 100 - whiteWin[i + 1];
    return { accuracy: moveAccuracy(before, after), weight: weights[i] };
  });
}

/**
 * Aggregates move accuracies: mean of the volatility-weighted mean and the harmonic mean.
 * Returns null when there are no moves. [OURS] per-move accuracy is floored at `harmonicFloor`
 * inside the harmonic mean to avoid division by zero.
 */
export function aggregateAccuracy(moves: MoveAccuracy[], cfg: ReviewConfig = REVIEW_CONFIG): number | null {
  if (moves.length === 0) return null;
  const totalWeight = moves.reduce((s, m) => s + m.weight, 0);
  const weighted = moves.reduce((s, m) => s + m.weight * m.accuracy, 0) / totalWeight;
  const harmonic = moves.length / moves.reduce((s, m) => s + 1 / Math.max(cfg.accuracy.harmonicFloor, m.accuracy), 0);
  return clamp((weighted + harmonic) / 2, 0, 100);
}

/** Accuracy for each player. */
export function gameAccuracy(input: AccuracyInput, cfg: ReviewConfig = REVIEW_CONFIG): Record<Color, number | null> {
  const per = moveAccuracies(input, cfg);
  return {
    w: aggregateAccuracy(per.filter((_, i) => input.movers[i] === "w"), cfg),
    b: aggregateAccuracy(per.filter((_, i) => input.movers[i] === "b"), cfg),
  };
}

function standardDeviation(values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
