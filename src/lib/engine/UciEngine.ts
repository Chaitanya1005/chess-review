import { parseBestMove, parseInfoLine } from "./uci";
import {
  EngineError,
  type AnalyseRequest,
  type AnalysisEngine,
  type EngineLine,
  type EngineResult,
  type EngineTransport,
  type UciInfo,
} from "./types";

export interface UciEngineOptions {
  hashMb?: number;
  /** Only has an effect on multi-threaded builds. */
  threads?: number;
  initTimeoutMs?: number;
  /** Wall-clock limit for a single search (docs/TECHNICAL_ARCHITECTURE.md §8). */
  searchTimeoutMs?: number;
  /** How long to wait for `bestmove` after sending `stop`. */
  stopGraceMs?: number;
}

interface Waiter {
  match: (line: string) => boolean;
  resolve: (line: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const DEFAULTS: Required<Omit<UciEngineOptions, "threads">> = {
  hashMb: 32,
  initTimeoutMs: 30_000,
  searchTimeoutMs: 30_000,
  stopGraceMs: 2_000,
};

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new DOMException("Analysis aborted", "AbortError");
}

/**
 * A UCI engine driven over an EngineTransport. One search runs at a time; calls are queued.
 * Engine-agnostic: works with any UCI engine that the transport can reach.
 */
export class UciEngine implements AnalysisEngine {
  name = "unknown";

  private readonly opts: Required<Omit<UciEngineOptions, "threads">> & { threads?: number };
  private waiter: Waiter | null = null;
  private infoSink: ((info: UciInfo) => void) | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private initPromise: Promise<void> | null = null;
  private failure: EngineError | null = null;
  private multiPv = 1;

  constructor(
    private readonly transport: EngineTransport,
    options: UciEngineOptions = {},
  ) {
    this.opts = { ...DEFAULTS, ...options };
    transport.onLine((line) => this.handleLine(line));
    transport.onError((error) =>
      this.fail(new EngineError(`Engine error: ${error.message}`, this.initPromise ? "crashed" : "load-failed")),
    );
  }

  init(): Promise<void> {
    this.initPromise ??= this.enqueue(async () => {
      await this.request("uci", (l) => l === "uciok", this.opts.initTimeoutMs, "load-failed");
      this.transport.send(`setoption name Hash value ${this.opts.hashMb}`);
      this.transport.send("setoption name UCI_ShowWDL value true");
      if (this.opts.threads) this.transport.send(`setoption name Threads value ${this.opts.threads}`);
      await this.isReady(this.opts.initTimeoutMs);
    });
    return this.initPromise;
  }

  async newGame(): Promise<void> {
    await this.init();
    return this.enqueue(async () => {
      this.transport.send("ucinewgame");
      await this.isReady(this.opts.initTimeoutMs);
    });
  }

  async analyse(request: AnalyseRequest, signal?: AbortSignal): Promise<EngineResult> {
    await this.init();
    return this.enqueue(() => this.search(request, signal));
  }

  dispose(): void {
    this.fail(new EngineError("Engine disposed", "disposed"));
  }

  private async search(request: AnalyseRequest, signal?: AbortSignal): Promise<EngineResult> {
    if (signal?.aborted) throw abortError(signal);

    if (request.multiPv !== this.multiPv) {
      this.transport.send(`setoption name MultiPV value ${request.multiPv}`);
      this.multiPv = request.multiPv;
    }
    const moves = request.moves.length > 0 ? ` moves ${request.moves.join(" ")}` : "";
    this.transport.send(`position fen ${request.startFen}${moves}`);

    const best = new Map<number, UciInfo>();
    // Per MultiPV slot keep the deepest exact-score line; a bound line is used only
    // when no exact line exists for that slot (docs/ANALYSIS_ENGINE.md §2).
    this.infoSink = (info) => {
      const current = best.get(info.multiPv);
      const replace =
        !current ||
        (current.bound !== undefined && info.bound === undefined) ||
        ((current.bound === undefined) === (info.bound === undefined) && info.depth >= current.depth);
      if (replace) best.set(info.multiPv, info);
    };

    const onAbort = () => this.transport.send("stop");
    signal?.addEventListener("abort", onAbort, { once: true });

    let bestLine: string;
    try {
      const go = request.movetimeMs ? `go depth ${request.depth} movetime ${request.movetimeMs}` : `go depth ${request.depth}`;
      try {
        bestLine = await this.request(go, (l) => l.startsWith("bestmove"), this.opts.searchTimeoutMs, "timeout");
      } catch (error) {
        if (!(error instanceof EngineError) || error.code !== "timeout") throw error;
        // Ask the engine to stop; UCI guarantees a bestmove reply.
        try {
          bestLine = await this.request("stop", (l) => l.startsWith("bestmove"), this.opts.stopGraceMs, "timeout");
        } catch {
          const failure = new EngineError("Engine did not respond to stop; restarting is required", "timeout");
          this.fail(failure);
          throw failure;
        }
      }
    } finally {
      signal?.removeEventListener("abort", onAbort);
      this.infoSink = null;
    }

    if (signal?.aborted) throw abortError(signal);

    const parsed = parseBestMove(bestLine)!;
    const lines: EngineLine[] = [...best.values()]
      .sort((a, b) => a.multiPv - b.multiPv)
      .map((i) => ({ multiPv: i.multiPv, depth: i.depth, score: i.score, wdl: i.wdl, pv: i.pv }));
    const top = best.get(1);
    return {
      bestMove: parsed.bestMove,
      lines,
      depth: top?.depth ?? 0,
      nodes: top?.nodes,
      timeMs: top?.timeMs,
    };
  }

  private async isReady(timeoutMs: number): Promise<void> {
    await this.request("isready", (l) => l === "readyok", timeoutMs, "timeout");
  }

  /**
   * Sends a command and resolves with the first matching reply. The waiter is registered
   * BEFORE sending: some engine builds reply synchronously inside send().
   */
  private request(
    command: string,
    match: (line: string) => boolean,
    timeoutMs: number,
    code: EngineError["code"],
  ): Promise<string> {
    const reply = this.expect(match, timeoutMs, code);
    if (!this.failure) this.transport.send(command);
    return reply;
  }

  private handleLine(raw: string): void {
    const line = raw.trim();
    if (!line) return;
    if (line.startsWith("id name ")) this.name = line.slice("id name ".length);
    if (this.infoSink && line.startsWith("info ")) {
      const info = parseInfoLine(line);
      if (info) this.infoSink(info);
    }
    const waiter = this.waiter;
    if (waiter && waiter.match(line)) {
      clearTimeout(waiter.timer);
      this.waiter = null;
      waiter.resolve(line);
    }
  }

  private expect(match: (line: string) => boolean, timeoutMs: number, code: EngineError["code"]): Promise<string> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiter = null;
        reject(new EngineError(`Engine did not respond within ${timeoutMs} ms`, code));
      }, timeoutMs);
      this.waiter = { match, resolve, reject, timer };
    });
  }

  /** Serialises engine work so only one command sequence talks to the engine at a time. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(() => {
      if (this.failure) throw this.failure;
      return task();
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private fail(error: EngineError): void {
    if (this.failure) return;
    this.failure = error;
    const waiter = this.waiter;
    this.waiter = null;
    if (waiter) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    try {
      this.transport.terminate();
    } catch {
      // already gone
    }
  }
}
