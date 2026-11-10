import type { Color } from "../engine/types";
import { PIECE_VALUES } from "../analysis/material";

export type CapturedRole = "q" | "r" | "b" | "n" | "p";

const START_COUNTS: Record<CapturedRole, number> = { q: 1, r: 2, b: 2, n: 2, p: 8 };
const ORDER: CapturedRole[] = ["q", "r", "b", "n", "p"];

export interface CapturedSummary {
  /** Opponent pieces that `color` has captured, most valuable first. */
  captured: Record<Color, CapturedRole[]>;
  /** Material advantage of each side in pawns (0 for the side that is behind or level). */
  advantage: Record<Color, number>;
}

/**
 * Captured pieces derived from the position alone (FR-BOARD-7), the way most board UIs do it:
 * pieces missing compared with the starting set. Promotions are accounted for by treating an
 * extra piece as a promoted pawn, so the list never goes negative. For custom start positions
 * this is an approximation (it compares with the standard set).
 */
export function capturedPieces(fen: string): CapturedSummary {
  const counts: Record<Color, Record<CapturedRole, number>> = {
    w: { q: 0, r: 0, b: 0, n: 0, p: 0 },
    b: { q: 0, r: 0, b: 0, n: 0, p: 0 },
  };
  for (const ch of fen.split(" ")[0]) {
    const role = ch.toLowerCase() as CapturedRole;
    if (!(role in START_COUNTS)) continue;
    counts[ch === role ? "b" : "w"][role]++;
  }

  const missing = (color: Color): CapturedRole[] => {
    const c = { ...counts[color] };
    // Each piece above the starting count must have come from a pawn promotion.
    let promoted = 0;
    for (const role of ORDER) {
      if (role !== "p" && c[role] > START_COUNTS[role]) {
        promoted += c[role] - START_COUNTS[role];
        c[role] = START_COUNTS[role];
      }
    }
    c.p += promoted;
    const out: CapturedRole[] = [];
    for (const role of ORDER) {
      for (let i = 0; i < Math.max(0, START_COUNTS[role] - c[role]); i++) out.push(role);
    }
    return out;
  };

  const value = (color: Color) => ORDER.reduce((sum, role) => sum + counts[color][role] * PIECE_VALUES[role], 0);
  const diff = value("w") - value("b");
  return {
    captured: { w: missing("b"), b: missing("w") },
    advantage: { w: Math.max(0, diff), b: Math.max(0, -diff) },
  };
}
