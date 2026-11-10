import { Chess } from "chess.js";
import type { AnalysisEngine, Color } from "../engine/types";
import type { ParsedGame } from "../pgn/types";
import { checkmatedScore, lineToWhitePov, toWhitePov, wdlToWhitePov } from "./evaluation";
import type { GameAnalysis, PositionAnalysis, TerminalState } from "./types";

export const DEFAULT_DEPTH = 14;
export const DEFAULT_MULTI_PV = 2;

export interface AnalyzeOptions {
  depth?: number;
  multiPv?: number;
  movetimeMs?: number;
  signal?: AbortSignal;
  onProgress?: (progress: { done: number; total: number; position: PositionAnalysis }) => void;
  /** Session cache shared across calls (FR-ENG-5). Create one with createAnalysisCache(). */
  cache?: AnalysisCache;
}

export type AnalysisCache = Map<string, PositionAnalysis>;

export function createAnalysisCache(): AnalysisCache {
  return new Map();
}

/** Cache key: FEN without the full-move counter, plus search settings (docs/DECISIONS.md D-007). */
export function cacheKey(fen: string, depth: number, multiPv: number): string {
  return `${fen.split(" ").slice(0, 5).join(" ")}|d${depth}|m${multiPv}`;
}

function terminalState(fen: string): TerminalState | undefined {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  if (chess.isInsufficientMaterial()) return "insufficient";
  return undefined;
}

/**
 * Analyses every position of a game's mainline: the start position and the position after each ply.
 * Results are White POV and associated with positions by ply index.
 */
export async function analyzeGame(game: ParsedGame, engine: AnalysisEngine, options: AnalyzeOptions = {}): Promise<GameAnalysis> {
  const depth = options.depth ?? DEFAULT_DEPTH;
  const multiPv = options.multiPv ?? DEFAULT_MULTI_PV;
  const cache = options.cache ?? createAnalysisCache();
  const started = Date.now();

  const fens = [game.startFen, ...game.moves.map((m) => m.fenAfter)];
  const total = fens.length;
  const positions: PositionAnalysis[] = [];

  await engine.newGame();

  for (let ply = 0; ply < total; ply++) {
    if (options.signal?.aborted) throw options.signal.reason ?? new DOMException("Analysis aborted", "AbortError");

    const fen = fens[ply];
    const sideToMove = fen.split(" ")[1] as Color;
    const key = cacheKey(fen, depth, multiPv);
    let position: PositionAnalysis;

    const terminal = terminalState(fen);
    const cached = cache.get(key);
    if (terminal) {
      position = {
        ply,
        fen,
        sideToMove,
        terminal,
        evaluation: terminal === "checkmate" ? checkmatedScore(sideToMove) : { type: "cp", value: 0 },
        lines: [],
        depth: 0,
        source: "rules",
      };
    } else if (cached) {
      position = { ...cached, ply, fen, source: "cache" };
    } else {
      const result = await engine.analyse(
        {
          startFen: game.startFen,
          moves: game.moves.slice(0, ply).map((m) => m.uci),
          depth,
          multiPv,
          movetimeMs: options.movetimeMs,
        },
        options.signal,
      );
      const top = result.lines[0];
      if (!top || !result.bestMove) {
        throw new Error(`Engine returned no evaluation for ply ${ply} (${fen})`);
      }
      position = {
        ply,
        fen,
        sideToMove,
        evaluation: toWhitePov(top.score, sideToMove),
        wdl: top.wdl ? wdlToWhitePov(top.wdl, sideToMove) : undefined,
        bestMove: result.bestMove,
        lines: result.lines.map((l) => lineToWhitePov(l, sideToMove)),
        depth: result.depth,
        source: "engine",
      };
      cache.set(key, position);
    }

    positions.push(position);
    options.onProgress?.({ done: ply + 1, total, position });
  }

  return {
    game,
    positions,
    settings: { engine: engine.name, depth, multiPv },
    durationMs: Date.now() - started,
  };
}
