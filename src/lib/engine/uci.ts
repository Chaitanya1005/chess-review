import type { Score, UciInfo, Wdl } from "./types";

const INT_FIELDS = new Set(["depth", "seldepth", "multipv", "nodes", "nps", "time", "hashfull", "tbhits"]);

/**
 * Parses a UCI `info` line. Returns null for lines without a score and a PV
 * (e.g. `info string …`, `info currmove …`). Scores stay side-to-move POV.
 */
export function parseInfoLine(line: string): UciInfo | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== "info") return null;

  const ints: Record<string, number> = {};
  let score: Score | undefined;
  let bound: UciInfo["bound"];
  let wdl: Wdl | undefined;
  let pv: string[] | undefined;

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "string") return null;
    if (INT_FIELDS.has(t)) {
      const n = Number(tokens[i + 1]);
      if (!Number.isFinite(n)) return null;
      ints[t] = n;
      i++;
    } else if (t === "score") {
      const kind = tokens[i + 1];
      const value = Number(tokens[i + 2]);
      if ((kind !== "cp" && kind !== "mate") || !Number.isFinite(value)) return null;
      score = { type: kind, value };
      i += 2;
      const next = tokens[i + 1];
      if (next === "lowerbound" || next === "upperbound") {
        bound = next === "lowerbound" ? "lower" : "upper";
        i++;
      }
    } else if (t === "wdl") {
      const w = [tokens[i + 1], tokens[i + 2], tokens[i + 3]].map(Number);
      if (w.every(Number.isFinite)) wdl = w as Wdl;
      i += 3;
    } else if (t === "pv") {
      pv = tokens.slice(i + 1);
      break;
    }
  }

  if (!score || !pv || pv.length === 0 || ints.depth === undefined) return null;

  return {
    depth: ints.depth,
    seldepth: ints.seldepth,
    multiPv: ints.multipv ?? 1,
    score,
    bound,
    wdl,
    nodes: ints.nodes,
    nps: ints.nps,
    timeMs: ints.time,
    pv,
  };
}

/** Parses `bestmove e2e4 [ponder e7e5]`. Returns undefined if the line is not a bestmove line. */
export function parseBestMove(line: string): { bestMove: string | null; ponder?: string } | undefined {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== "bestmove") return undefined;
  const move = tokens[1];
  const bestMove = !move || move === "(none)" || move === "0000" ? null : move;
  const ponder = tokens[2] === "ponder" ? tokens[3] : undefined;
  return { bestMove, ponder };
}

/** UCI move notation check: e2e4, e7e8q. */
export function isUciMove(move: string): boolean {
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move);
}
