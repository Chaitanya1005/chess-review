import type { Color } from "@/lib/engine/types";
import type { PlayerReview } from "@/lib/review/buildReview";
import type { CapturedRole } from "@/lib/review/capturedPieces";

// Unicode chess symbols (no image assets). Filled glyphs for both sides; colour set by CSS.
const GLYPHS: Record<CapturedRole, string> = { q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const NAMES: Record<CapturedRole, string> = { q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };

interface PlayerBarProps {
  color: Color;
  player: PlayerReview;
  /** Opponent pieces this player has captured at the selected position. */
  captured: CapturedRole[];
  advantage: number;
  toMove: boolean;
}

/** Name, header rating, accuracy, captured pieces and material difference (FR-BOARD-7). */
export function PlayerBar({ color, player, captured, advantage, toMove }: PlayerBarProps) {
  const capturedLabel = captured.length ? `Captured: ${captured.map((r) => NAMES[r]).join(", ")}` : "No captures";
  return (
    <div className="flex min-h-10 items-center gap-2 px-1 py-1" data-testid={`player-${color}`}>
      <span
        aria-hidden="true"
        className={`h-3.5 w-3.5 shrink-0 rounded-sm border border-[#71717a] ${color === "w" ? "bg-[#f5f5f4]" : "bg-[#18181b]"}`}
      />
      <span className="min-w-0 truncate text-sm font-semibold">
        {player.name}
        {player.headerRating !== undefined && <span className="ml-1 font-normal text-muted">({player.headerRating})</span>}
      </span>
      {toMove && <span className="sr-only">(to move)</span>}
      <span className="flex min-w-0 items-center text-base leading-none" aria-label={capturedLabel} role="img">
        <span aria-hidden="true" className={`truncate tracking-[-0.15em] ${color === "w" ? "text-[#27272a] dark:text-[#d4d4d8]" : "text-[#71717a] dark:text-[#a1a1aa]"}`}>
          {captured.map((r) => GLYPHS[r]).join("")}
        </span>
      </span>
      {advantage > 0 && <span className="text-xs font-medium text-muted">+{advantage}</span>}
      <span className="ml-auto shrink-0 rounded bg-surface-2 px-2 py-0.5 text-sm font-semibold tabular-nums" title="Accuracy">
        <span className="sr-only">Accuracy </span>
        {player.accuracy === null ? "—" : player.accuracy.toFixed(1)}
      </span>
    </div>
  );
}
