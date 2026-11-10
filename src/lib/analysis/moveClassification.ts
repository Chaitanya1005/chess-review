import { Chess } from "chess.js";
import type { ParsedMove } from "../pgn/types";
import { REVIEW_CONFIG, type ReviewConfig } from "./config";
import { mateWinner } from "./evaluation";
import { expectedPoints, sameScore } from "./expectedPoints";
import { detectSacrifice, type SacrificeResult } from "./sacrifice";
import type { PositionAnalysis } from "./types";

export const CLASSIFICATIONS = [
  "brilliant",
  "great",
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "miss",
  "blunder",
] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export interface MoveAssessment {
  ply: number;
  color: ParsedMove["color"];
  san: string;
  uci: string;
  classification: Classification;
  /** Label from expected-points loss alone, before special rules. */
  baseClassification: Classification;
  /** Mover's expected points before (best play) and after the move. */
  epBefore: number;
  epAfter: number;
  epLoss: number;
  isEngineBest: boolean;
  bestMove?: string;
  /** Mover's EP with the engine's second line, when MultiPV ≥ 2. */
  secondBestEP?: number;
  /** EP(line 1) − EP(line 2) for the mover: how "only" the best move was. */
  onlyMoveGap?: number;
  legalMoveCount: number;
  sacrifice?: SacrificeResult;
  /** Machine-readable reasons for special labels, e.g. "only-move", "sacrifice:pv", "miss". */
  reasons: string[];
}

type Thresholds = ReviewConfig["thresholds"];

/** Base classification from expected points lost [CC-PUBLIC thresholds, upper bound inclusive]. */
export function baseClassification(epLoss: number, isEngineBest: boolean, t: Thresholds = REVIEW_CONFIG.thresholds): Classification {
  if (isEngineBest || epLoss <= 0) return "best";
  if (epLoss <= t.excellent) return "excellent";
  if (epLoss <= t.good) return "good";
  if (epLoss <= t.inaccuracy) return "inaccuracy";
  if (epLoss <= t.mistake) return "mistake";
  return "blunder";
}

/**
 * Classifies every move (docs/ANALYSIS_ENGINE.md §6). Pure and deterministic.
 * `positions[i]` is the analysis of the position after ply i (positions[0] = start).
 */
export function classifyMoves(moves: ParsedMove[], positions: PositionAnalysis[], cfg: ReviewConfig = REVIEW_CONFIG): MoveAssessment[] {
  if (positions.length !== moves.length + 1) {
    throw new Error(`Expected ${moves.length + 1} positions, got ${positions.length}`);
  }
  const ep = cfg.expectedPoints;
  const out: MoveAssessment[] = [];

  moves.forEach((move, i) => {
    const before = positions[i];
    const after = positions[i + 1];
    const mover = move.color;

    const epBefore = expectedPoints(before.evaluation, mover, ep);
    const epAfter = expectedPoints(after.evaluation, mover, ep);
    const top = before.lines[0];
    const isEngineBest =
      move.uci === before.bestMove ||
      (top !== undefined && before.lines.some((l) => l.pv[0] === move.uci && sameScore(l.score, top.score)));
    const epLoss = isEngineBest ? 0 : Math.max(0, epBefore - epAfter);
    const base = baseClassification(epLoss, isEngineBest, cfg.thresholds);

    const second = before.lines[1];
    const secondBestEP = second ? expectedPoints(second.score, mover, ep) : undefined;
    const onlyMoveGap = top && secondBestEP !== undefined ? expectedPoints(top.score, mover, ep) - secondBestEP : undefined;
    const legalMoveCount = new Chess(move.fenBefore).moves().length;

    const assessment: MoveAssessment = {
      ply: move.ply,
      color: mover,
      san: move.san,
      uci: move.uci,
      classification: base,
      baseClassification: base,
      epBefore,
      epAfter,
      epLoss,
      isEngineBest,
      bestMove: before.bestMove,
      secondBestEP,
      onlyMoveGap,
      legalMoveCount,
      reasons: [],
    };

    const label =
      brilliant(assessment, move, after, cfg) ??
      great(assessment, move, moves[i - 1], before, cfg) ??
      miss(assessment, out[i - 1], positions[i - 1], cfg);
    if (label) assessment.classification = label;
    out.push(assessment);
  });

  return out;
}

function brilliant(a: MoveAssessment, move: ParsedMove, after: PositionAnalysis, cfg: ReviewConfig): Classification | undefined {
  const b = cfg.brilliant;
  if (a.legalMoveCount <= 1 || a.epLoss > b.maxLoss || a.epAfter < b.minEPAfter) return undefined;
  const pvAfter = after.lines[0]?.pv ?? [];
  const sacrifice = detectSacrifice(move.fenBefore, move.uci, pvAfter, { minValue: b.sacrificeMinValue, pvPlies: b.sacrificePvPlies });
  a.sacrifice = sacrifice;
  if (!sacrifice.isSacrifice) return undefined;
  // Not already completely winning without the sacrifice: the best alternative (line 2 when the
  // sacrifice is the engine's top move, otherwise the position's best evaluation).
  const epWithout = a.isEngineBest && a.secondBestEP !== undefined ? a.secondBestEP : a.epBefore;
  if (epWithout >= b.maxEPWithout) return undefined;
  a.reasons.push(`sacrifice:${sacrifice.kind}`);
  return "brilliant";
}

function great(
  a: MoveAssessment,
  move: ParsedMove,
  previous: ParsedMove | undefined,
  before: PositionAnalysis,
  cfg: ReviewConfig,
): Classification | undefined {
  const g = cfg.great;
  if (!a.isEngineBest || a.legalMoveCount <= 1) return undefined;
  if (a.onlyMoveGap === undefined || a.secondBestEP === undefined) return undefined;
  if (a.onlyMoveGap < g.onlyMoveGap || a.secondBestEP >= g.maxSecondEP) return undefined;
  // Continuing a forced mate the mover already had is not "critical" (e.g. delivering mate in 1).
  if (g.excludeForcedMate && mateWinner(before.evaluation) === a.color) return undefined;
  // Obvious "only moves" are not Great: taking the piece the opponent just moved (recaptures,
  // accepting an offered piece) and getting out of check.
  if (g.excludeCaptureOfLastMoved && move.captured !== undefined && previous?.to === move.to) return undefined;
  if (g.excludeCheckResponses && new Chess(move.fenBefore).inCheck()) return undefined;
  a.reasons.push("only-move");
  return "great";
}

function miss(
  a: MoveAssessment,
  opponentMove: MoveAssessment | undefined,
  beforeOpponentMove: PositionAnalysis | undefined,
  cfg: ReviewConfig,
): Classification | undefined {
  const m = cfg.miss;
  if (!opponentMove || !beforeOpponentMove || a.epLoss < m.minLoss) return undefined;
  if (a.epAfter >= m.stillWinningEP) return undefined;
  // Mover's EP before the opponent's previous move.
  const epPrior = expectedPoints(beforeOpponentMove.evaluation, a.color, cfg.expectedPoints);
  const opponentErred =
    opponentMove.classification === "mistake" ||
    opponentMove.classification === "blunder" ||
    opponentMove.classification === "miss" ||
    a.epBefore - epPrior >= m.opportunityGain;
  if (!opponentErred) return undefined;
  if (a.epAfter > epPrior + m.giveBackMargin) return undefined;
  a.reasons.push("miss");
  return "miss";
}
