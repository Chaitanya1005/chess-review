"use client";

import { useEffect, useRef } from "react";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { Key } from "@lichess-org/chessground/types";
import "@lichess-org/chessground/assets/chessground.base.css";
import "@lichess-org/chessground/assets/chessground.brown.css";
import "@lichess-org/chessground/assets/chessground.cburnett.css";
import type { Classification } from "@/lib/analysis/moveClassification";
import type { Color } from "@/lib/engine/types";
import { ClassificationBadge } from "./ClassificationBadge";

export interface BoardArrow {
  from: string;
  to: string;
}

export interface BoardProps {
  fen: string;
  orientation: Color;
  lastMove?: [string, string];
  /** Side in check, if any (highlights its king). */
  check?: Color;
  /** Engine best-move arrow (FR-BOARD-5). */
  arrow?: BoardArrow;
  /** Classification badge on the destination square of the selected move (FR-BOARD-9). */
  badge?: { square: string; classification: Classification };
  onSwipe?: (direction: "prev" | "next") => void;
}

const toColor = (c: Color) => (c === "w" ? "white" : "black");

/** View-only Chessground board (D-014). Created once; reconfigured on every prop change. */
export function Board({ fen, orientation, lastMove, check, arrow, badge, onSwipe }: BoardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const api = Chessground(hostRef.current, {
      viewOnly: true,
      coordinates: true,
      animation: { enabled: true, duration: 150 },
      highlight: { lastMove: true, check: true },
      drawable: { enabled: false, visible: true },
    });
    apiRef.current = api;
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => api.redrawAll()) : null;
    observer?.observe(hostRef.current);
    return () => {
      observer?.disconnect();
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    apiRef.current?.set({
      fen,
      orientation: toColor(orientation),
      turnColor: fen.split(" ")[1] === "b" ? "black" : "white",
      lastMove: lastMove as Key[] | undefined,
      check: check ? toColor(check) : false,
      drawable: {
        autoShapes: arrow ? [{ orig: arrow.from as Key, dest: arrow.to as Key, brush: "green" }] : [],
      },
    });
  }, [fen, orientation, lastMove, check, arrow]);

  return (
    <div
      className="relative aspect-square w-full select-none"
      data-testid="board"
      data-fen={fen}
      data-orientation={orientation}
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchRef.current = t ? { x: t.clientX, y: t.clientY } : null;
      }}
      onTouchEnd={(e) => {
        const start = touchRef.current;
        const t = e.changedTouches[0];
        touchRef.current = null;
        if (!start || !t || !onSwipe) return;
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > 1.5 * Math.abs(dy)) onSwipe(dx < 0 ? "next" : "prev");
      }}
    >
      <div ref={hostRef} className="h-full w-full" />
      {badge && <SquareBadge {...badge} orientation={orientation} />}
    </div>
  );
}

function SquareBadge({ square, classification, orientation }: { square: string; classification: Classification; orientation: Color }) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  if (!(file >= 0 && file < 8 && rank >= 1 && rank <= 8)) return null;
  const col = orientation === "w" ? file : 7 - file;
  const row = orientation === "w" ? 8 - rank : rank - 1;
  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{ left: `${(col + 1) * 12.5}%`, top: `${row * 12.5}%`, transform: "translate(-62%, -38%)" }}
    >
      <ClassificationBadge classification={classification} size="board" />
    </div>
  );
}
