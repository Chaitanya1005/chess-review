import type { Color } from "../engine/types";
import { REVIEW_CONFIG, type ReviewConfig } from "./config";
import { aggregateAccuracy, type MoveAccuracy } from "./accuracy";
import { CLASSIFICATIONS, type Classification } from "./moveClassification";
import { GAME_PHASES, type GamePhase } from "./gamePhases";

export type ClassificationCounts = Record<Classification, number>;

export interface PhaseStats {
  moveCount: number;
  accuracy: number | null;
  counts: ClassificationCounts;
}

export interface PlayerStats {
  moveCount: number;
  accuracy: number | null;
  counts: ClassificationCounts;
  phases: Record<GamePhase, PhaseStats>;
}

export interface StatsMove {
  color: Color;
  classification: Classification;
  phase: GamePhase;
  accuracy: MoveAccuracy;
}

export function emptyCounts(): ClassificationCounts {
  return Object.fromEntries(CLASSIFICATIONS.map((c) => [c, 0])) as ClassificationCounts;
}

function summarise(moves: StatsMove[], cfg: ReviewConfig): PhaseStats {
  const counts = emptyCounts();
  for (const m of moves) counts[m.classification]++;
  return { moveCount: moves.length, accuracy: aggregateAccuracy(moves.map((m) => m.accuracy), cfg), counts };
}

/**
 * Per-player statistics. Counts are derived from the classifications themselves, so they
 * always reconcile: sum(counts) === moveCount (FR-STAT-3).
 */
export function playerStats(moves: StatsMove[], color: Color, cfg: ReviewConfig = REVIEW_CONFIG): PlayerStats {
  const own = moves.filter((m) => m.color === color);
  const overall = summarise(own, cfg);
  const phases = Object.fromEntries(
    GAME_PHASES.map((phase) => [phase, summarise(own.filter((m) => m.phase === phase), cfg)]),
  ) as Record<GamePhase, PhaseStats>;
  return { ...overall, phases };
}
