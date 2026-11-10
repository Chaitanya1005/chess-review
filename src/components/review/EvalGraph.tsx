"use client";

import { useEffect, useRef, useState } from "react";
import type { MoveReview } from "@/lib/review/buildReview";
import { CLASSIFICATION_INFO } from "@/lib/review/classificationInfo";
import { areaPath, linePoints, plyToX, valueToY, xToPly } from "@/lib/review/evalGraph";

interface EvalGraphProps {
  /** White expected score (%) for each position, index = ply. */
  values: number[];
  moves: MoveReview[];
  ply: number;
  onSelect: (ply: number) => void;
  height?: number;
}

/**
 * Evaluation graph (FR-GRAPH-1…4): White's expected score on a win-probability scale, White's
 * share drawn light from the bottom. Markers for notable moves; click or tap to select a ply.
 */
export function EvalGraph({ values, moves, ply, onSelect, height = 96 }: EvalGraphProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const g = { width: Math.max(width, 1), height };
  const count = values.length;
  const selectFromEvent = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    onSelect(xToPly(clientX - rect.left, count, { width: rect.width, height }));
  };
  const summary = `Evaluation graph over ${count - 1} moves. Selected position: White ${Math.round(values[ply] ?? 50)}% expected score.`;

  return (
    <div
      ref={wrapRef}
      className="relative w-full cursor-pointer touch-pan-y overflow-hidden rounded-md border border-line"
      style={{ height }}
      data-testid="eval-graph"
      onPointerDown={(e) => selectFromEvent(e.clientX)}
      onPointerMove={(e) => {
        if (e.buttons === 1 && e.pointerType === "mouse") selectFromEvent(e.clientX);
      }}
    >
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={summary} className="block">
          <rect x={0} y={0} width={width} height={height} fill="var(--graph-black)" />
          <path d={areaPath(values, g)} fill="var(--graph-white)" />
          <line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke="#a1a1aa" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
          <polyline points={linePoints(values, g)} fill="none" stroke="#a1a1aa" strokeWidth={1} />
          <line
            x1={plyToX(ply, count, g)}
            x2={plyToX(ply, count, g)}
            y1={0}
            y2={height}
            stroke="var(--accent)"
            strokeWidth={2}
            data-testid="eval-graph-cursor"
          />
          {moves.map((m) => {
            const info = CLASSIFICATION_INFO[m.classification];
            if (!info.marked) return null;
            return (
              <circle
                key={m.ply}
                cx={plyToX(m.ply, count, g)}
                cy={valueToY(values[m.ply], g)}
                r={m.ply === ply ? 5 : 3.5}
                fill={info.color}
                stroke="#ffffff"
                strokeWidth={1}
              >
                <title>{`${m.moveNumber}${m.color === "w" ? "." : "..."} ${m.san}: ${info.label}`}</title>
              </circle>
            );
          })}
        </svg>
      )}
    </div>
  );
}
