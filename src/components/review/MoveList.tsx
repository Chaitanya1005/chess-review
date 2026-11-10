"use client";

import { useEffect, useRef } from "react";
import type { MoveReview } from "@/lib/review/buildReview";
import { CLASSIFICATION_INFO } from "@/lib/review/classificationInfo";
import { ClassificationBadge } from "./ClassificationBadge";

interface Row {
  number: number;
  white?: MoveReview;
  black?: MoveReview;
}

function toRows(moves: MoveReview[]): Row[] {
  const rows: Row[] = [];
  for (const m of moves) {
    let row = rows[rows.length - 1];
    if (!row || row.number !== m.moveNumber || (m.color === "w" && row.white) || row.black) {
      row = { number: m.moveNumber };
      rows.push(row);
    }
    if (m.color === "w") row.white = m;
    else row.black = m;
  }
  return rows;
}

/** Move list with classification icons (FR-BOARD-3/4). Clicking a move selects its ply. */
export function MoveList({ moves, ply, onSelect }: { moves: MoveReview[]; ply: number; onSelect: (ply: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the selected move visible by scrolling the list only (not the page).
  useEffect(() => {
    const container = containerRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-ply="${ply}"]`);
    if (!container || !el) return;
    const top = el.offsetTop; // the container is the offsetParent (position: relative)
    if (top < container.scrollTop) container.scrollTop = top - 8;
    else if (top + el.offsetHeight > container.scrollTop + container.clientHeight) {
      container.scrollTop = top + el.offsetHeight - container.clientHeight + 8;
    }
  }, [ply]);

  const cell = (m: MoveReview | undefined) => {
    if (!m) return <span />;
    const selected = m.ply === ply;
    return (
      <button
        type="button"
        data-ply={m.ply}
        aria-current={selected ? "step" : undefined}
        aria-label={`${m.moveNumber}${m.color === "w" ? "." : "..."} ${m.san}, ${CLASSIFICATION_INFO[m.classification].label}`}
        onClick={() => onSelect(m.ply)}
        className={`flex min-h-9 w-full items-center gap-1.5 rounded px-2 py-1 text-left font-mono text-sm transition-colors ${
          selected ? "bg-accent text-accent-foreground" : "hover:bg-surface-2"
        }`}
      >
        <ClassificationBadge classification={m.classification} size="sm" />
        <span className="truncate">{m.san}</span>
      </button>
    );
  };

  return (
    <div ref={containerRef} className="relative max-h-[22rem] overflow-y-auto pr-1" data-testid="move-list">
      <ol className="grid grid-cols-[2.5rem_1fr_1fr] gap-x-1 gap-y-0.5">
        {toRows(moves).map((row, i) => (
          <li key={i} className="contents">
            <span className="flex items-center justify-end pr-1 font-mono text-xs text-muted">{row.number}.</span>
            {cell(row.white)}
            {cell(row.black)}
          </li>
        ))}
      </ol>
    </div>
  );
}
