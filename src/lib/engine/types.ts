export type Color = "w" | "b";

/**
 * An engine score.
 * - In UCI output (side-to-move POV), `mate 0` means the side to move is checkmated.
 * - In stored data (White POV), positive = good for White. A mate value of 0 only occurs
 *   for an already-checkmated position and then `winner` says who won.
 */
export type Score =
  | { type: "cp"; value: number }
  | { type: "mate"; value: number; winner?: Color };

/** Win / draw / loss in per mille, from the POV the containing object states. */
export type Wdl = [win: number, draw: number, loss: number];

/** One parsed UCI `info` line (side-to-move POV, exactly as the engine reported it). */
export interface UciInfo {
  depth: number;
  seldepth?: number;
  multiPv: number;
  score: Score;
  bound?: "lower" | "upper";
  wdl?: Wdl;
  nodes?: number;
  nps?: number;
  timeMs?: number;
  pv: string[];
}

/** A principal variation from one MultiPV slot. */
export interface EngineLine {
  multiPv: number;
  depth: number;
  score: Score;
  wdl?: Wdl;
  pv: string[];
}

/** The result of searching one position, side-to-move POV. */
export interface EngineResult {
  bestMove: string | null;
  lines: EngineLine[];
  depth: number;
  nodes?: number;
  timeMs?: number;
}

export interface AnalyseRequest {
  /** FEN of the game's starting position. */
  startFen: string;
  /** Moves (UCI) from startFen to the position to analyse. Gives the engine the game history. */
  moves: string[];
  depth: number;
  multiPv: number;
  /** Optional hard cap per search, in addition to depth. */
  movetimeMs?: number;
}

/**
 * The interface the analysis pipeline depends on (docs/DECISIONS.md D-005).
 * Implemented by UciEngine; tests may provide fakes.
 */
export interface AnalysisEngine {
  /** Engine identification, e.g. "Stockfish 19". Available after init(). */
  readonly name: string;
  init(): Promise<void>;
  newGame(): Promise<void>;
  analyse(request: AnalyseRequest, signal?: AbortSignal): Promise<EngineResult>;
  dispose(): void;
}

/** Raw text channel to a UCI engine (Web Worker in the browser, WASM module in Node). */
export interface EngineTransport {
  send(command: string): void;
  onLine(listener: (line: string) => void): void;
  onError(listener: (error: Error) => void): void;
  terminate(): void;
}

export class EngineError extends Error {
  constructor(
    message: string,
    readonly code: "load-failed" | "timeout" | "crashed" | "disposed" | "protocol",
  ) {
    super(message);
    this.name = "EngineError";
  }
}
