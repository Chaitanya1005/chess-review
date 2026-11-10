import { Chess, DEFAULT_POSITION, validateFen } from "chess.js";
import { PgnError, type GameResult, type ParsedGame, type ParsedMove } from "./types";

export const MAX_PGN_BYTES = 1_000_000;

const SUPPORTED_VARIANTS = new Set(["", "standard", "chess", "normal"]);

export interface ParsePgnOptions {
  /** Reject games with no moves (default true: there is nothing to review). */
  requireMoves?: boolean;
}

/**
 * Parses the mainline of the first game in a PGN. Comments, NAGs and variations are ignored.
 * Throws PgnError with a user-readable message on invalid input.
 */
export function parsePgn(input: string, options: ParsePgnOptions = {}): ParsedGame {
  const requireMoves = options.requireMoves ?? true;
  const warnings: string[] = [];

  if (new TextEncoder().encode(input).length > MAX_PGN_BYTES) {
    throw new PgnError("The PGN is larger than 1 MB. Paste a single game.", "too-large");
  }
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n").trim();
  if (!text) throw new PgnError("Paste a PGN or choose a file.", "empty");

  const games = splitGames(text);
  if (games.length > 1) {
    warnings.push(`The PGN contains ${games.length} games. Only the first game is reviewed.`);
  }
  const pgn = games[0];

  const tags = readTags(pgn);
  const variant = (tags.Variant ?? "").trim().toLowerCase();
  if (!SUPPORTED_VARIANTS.has(variant)) {
    throw new PgnError(`Only standard chess is supported for now (this game is "${tags.Variant}").`, "unsupported-variant");
  }
  if (tags.FEN !== undefined) {
    const check = validateFen(tags.FEN);
    if (!check.ok) throw new PgnError(`The starting position (FEN tag) is invalid: ${check.error}`, "invalid-fen");
  }

  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch (error) {
    throw toPgnError(error, chess, tags.FEN);
  }

  const headers = chess.getHeaders();
  const history = chess.history({ verbose: true });
  if (requireMoves && history.length === 0) {
    throw new PgnError("The PGN has no moves to review.", "no-moves");
  }

  const startFen = history[0]?.before ?? tags.FEN ?? DEFAULT_POSITION;
  const firstMoveNumber = Number(startFen.split(" ")[5]) || 1;
  const blackStarts = startFen.split(" ")[1] === "b";

  const moves: ParsedMove[] = history.map((m, i) => {
    const plyFromWhite = i + (blackStarts ? 1 : 0);
    return {
      ply: i + 1,
      moveNumber: firstMoveNumber + Math.floor(plyFromWhite / 2),
      color: m.color,
      san: m.san,
      uci: m.from + m.to + (m.promotion ?? ""),
      from: m.from,
      to: m.to,
      piece: m.piece,
      captured: m.captured,
      promotion: m.promotion,
      fenBefore: m.before,
      fenAfter: m.after,
    };
  });

  return { headers, startFen, moves, result: readResult(headers.Result, pgn), warnings };
}

/** Splits a multi-game PGN: a new game starts at a tag line that follows movetext. */
function splitGames(text: string): string[] {
  const lines = text.split("\n");
  const games: string[][] = [[]];
  let seenMoves = false;
  for (const line of lines) {
    const isTag = /^\s*\[[A-Za-z0-9_]+\s+".*"\s*\]\s*$/.test(line);
    if (isTag && seenMoves) {
      games.push([]);
      seenMoves = false;
    }
    if (!isTag && line.trim()) seenMoves = true;
    games[games.length - 1].push(line);
  }
  return games.map((g) => g.join("\n").trim()).filter(Boolean);
}

function readTags(pgn: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const match of pgn.matchAll(/^\s*\[([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\s*\]/gm)) {
    tags[match[1]] = match[2];
  }
  return tags;
}

function readResult(header: string | undefined, pgn: string): GameResult {
  const valid: GameResult[] = ["1-0", "0-1", "1/2-1/2", "*"];
  if (header && (valid as string[]).includes(header)) return header as GameResult;
  const trailing = pgn.match(/(1-0|0-1|1\/2-1\/2|\*)\s*$/);
  return (trailing?.[1] as GameResult) ?? "*";
}

function toPgnError(error: unknown, chess: Chess, fenTag: string | undefined): PgnError {
  const message = error instanceof Error ? error.message : String(error);
  const illegal = message.match(/Invalid move in PGN: (\S+)/);
  if (illegal) {
    // chess.js keeps the moves it managed to play before the failure.
    const played = chess.history().length;
    const start = fenTag ?? DEFAULT_POSITION;
    const blackStarts = start.split(" ")[1] === "b";
    const startNumber = Number(start.split(" ")[5]) || 1;
    const plyFromWhite = played + (blackStarts ? 1 : 0);
    const moveNumber = startNumber + Math.floor(plyFromWhite / 2);
    const dots = plyFromWhite % 2 === 0 ? "." : "...";
    return new PgnError(`Illegal or unreadable move at ${moveNumber}${dots} ${illegal[1]}.`, "illegal-move");
  }
  if (/fen/i.test(message)) return new PgnError(`The starting position is invalid: ${message}`, "invalid-fen");
  return new PgnError(`This does not look like a valid PGN: ${message}`, "parse-error");
}
