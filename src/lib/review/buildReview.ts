import type { Color, Score } from "../engine/types";
import { moveAccuracies } from "../analysis/accuracy";
import { REVIEW_CONFIG, type ReviewConfig } from "../analysis/config";
import { movePhases, type GamePhase } from "../analysis/gamePhases";
import { playerStats, type PlayerStats } from "../analysis/gameStatistics";
import { uciLineToSan } from "../analysis/material";
import { classifyMoves, type MoveAssessment } from "../analysis/moveClassification";
import { estimateRating, type RatingEstimate } from "../analysis/performanceRating";
import type { AnalysisSettings, GameAnalysis } from "../analysis/types";

export interface MoveReview extends MoveAssessment {
  moveNumber: number;
  phase: GamePhase;
  /** Lichess-method accuracy of this single move, 0–100. */
  accuracy: number;
  evalBefore: Score;
  evalAfter: Score;
  bestMoveSan?: string;
  /** Engine continuation from the position before the move (best line), in SAN. */
  bestLineSan: string[];
  /** Engine continuation after the move that was played, in SAN. */
  playedLineSan: string[];
}

export interface PlayerReview extends PlayerStats {
  name: string;
  /** Rating from the PGN header, if present (not used in calculations yet). */
  headerRating?: number;
  rating: RatingEstimate | null;
}

export interface GameReview {
  classificationVersion: string;
  settings: AnalysisSettings;
  headers: Record<string, string>;
  result: string;
  moves: MoveReview[];
  players: Record<Color, PlayerReview>;
}

const PV_SAN_PLIES = 10;

/** Turns raw engine analysis into a complete, deterministic game review. */
export function buildReview(analysis: GameAnalysis, cfg: ReviewConfig = REVIEW_CONFIG): GameReview {
  const { game, positions } = analysis;
  const assessments = classifyMoves(game.moves, positions, cfg);
  const fens = positions.map((p) => p.fen);
  const phases = movePhases(fens, cfg);
  const accuracies = moveAccuracies({ evaluations: positions.map((p) => p.evaluation), movers: game.moves.map((m) => m.color) }, cfg);

  const moves: MoveReview[] = assessments.map((a, i) => {
    const move = game.moves[i];
    const before = positions[i];
    const after = positions[i + 1];
    const bestLineSan = uciLineToSan(before.fen, (before.lines[0]?.pv ?? []).slice(0, PV_SAN_PLIES));
    return {
      ...a,
      moveNumber: move.moveNumber,
      phase: phases[i],
      accuracy: accuracies[i].accuracy,
      evalBefore: before.evaluation,
      evalAfter: after.evaluation,
      bestMoveSan: before.bestMove ? uciLineToSan(before.fen, [before.bestMove])[0] : undefined,
      bestLineSan,
      playedLineSan: uciLineToSan(after.fen, (after.lines[0]?.pv ?? []).slice(0, PV_SAN_PLIES)),
    };
  });

  const statsMoves = moves.map((m, i) => ({ color: m.color, classification: m.classification, phase: m.phase, accuracy: accuracies[i] }));
  const player = (color: Color): PlayerReview => {
    const stats = playerStats(statsMoves, color, cfg);
    const header = Number(game.headers[color === "w" ? "WhiteElo" : "BlackElo"]);
    return {
      ...stats,
      name: game.headers[color === "w" ? "White" : "Black"] ?? (color === "w" ? "White" : "Black"),
      headerRating: Number.isFinite(header) && header > 0 ? header : undefined,
      rating: estimateRating(stats.accuracy, cfg),
    };
  };

  return {
    classificationVersion: cfg.version,
    settings: analysis.settings,
    headers: game.headers,
    result: game.result,
    moves,
    players: { w: player("w"), b: player("b") },
  };
}
