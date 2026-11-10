import { MAX_PGN_BYTES } from "./parsePgn";

const TEXT_TYPES = new Set(["", "text/plain", "application/x-chess-pgn", "application/vnd.chess-pgn", "text/x-pgn"]);

/** Error message for a chosen file that is too large or clearly not text (PRD §4), else null. */
export function checkPgnFile(file: { name: string; size: number; type: string }): string | null {
  if (file.size > MAX_PGN_BYTES) return "The file is larger than 1 MB. Choose a file with a single game.";
  const isPgnName = /\.(pgn|txt)$/i.test(file.name);
  if (!isPgnName && !TEXT_TYPES.has(file.type) && !file.type.startsWith("text/")) {
    return "That file does not look like a PGN. Choose a .pgn or text file.";
  }
  return null;
}

/** True when decoded file text contains NUL bytes, i.e. it is binary rather than a PGN. */
export function looksBinary(text: string): boolean {
  return text.includes("\u0000");
}
