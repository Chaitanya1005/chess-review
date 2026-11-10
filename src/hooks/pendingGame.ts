/**
 * Hands the PGN from the homepage to the review route via sessionStorage
 * (TECHNICAL_ARCHITECTURE.md §10). Nothing leaves the browser; the PGN never goes into the URL.
 */
const KEY = "chess-review:pending-game";

export interface PendingGame {
  pgn: string;
  presetId: string;
}

// In-memory copy for browsers that block sessionStorage (client-side navigation keeps it).
let memory: PendingGame | null = null;

export function savePendingGame(game: PendingGame): boolean {
  memory = game;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(game));
    return true;
  } catch {
    return false;
  }
}

export function loadPendingGame(): PendingGame | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return memory;
    const value = JSON.parse(raw) as Partial<PendingGame>;
    if (typeof value.pgn !== "string") return null;
    return { pgn: value.pgn, presetId: typeof value.presetId === "string" ? value.presetId : "" };
  } catch {
    return memory;
  }
}

export function clearPendingGame(): void {
  memory = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Storage unavailable: nothing stored there.
  }
}
