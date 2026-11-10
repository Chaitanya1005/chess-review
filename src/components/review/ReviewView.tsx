"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { Chess } from "chess.js";
import type { GameAnalysis } from "@/lib/analysis/types";
import type { Color } from "@/lib/engine/types";
import type { GameReview } from "@/lib/review/buildReview";
import { capturedPieces } from "@/lib/review/capturedPieces";
import { graphValues } from "@/lib/review/evalGraph";
import { explainMove } from "@/lib/review/explainMove";
import { initialViewState, keyToAction, reviewViewReducer } from "@/lib/review/navigation";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Board } from "./Board";
import { EvalBar } from "./EvalBar";
import { EvalGraph } from "./EvalGraph";
import { MoveList } from "./MoveList";
import { MovePanel } from "./MovePanel";
import { NavControls } from "./NavControls";
import { PlayerBar } from "./PlayerBar";
import { StatsPanel } from "./StatsPanel";

type Tab = "moves" | "stats" | "graph";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

/**
 * The complete review screen for one analysed game. All panels read the single selected ply
 * from one reducer, so board, move list, graph and explanation stay in sync.
 */
export function ReviewView({ analysis, review }: { analysis: GameAnalysis; review: GameReview }) {
  const lastPly = review.moves.length;
  const [view, dispatch] = useReducer(reviewViewReducer, lastPly, (n) => initialViewState(n));
  const [tab, setTab] = useState<Tab>("moves");
  const wide = useMediaQuery("(min-width: 768px)");
  const activeTab: Tab = wide && tab === "graph" ? "moves" : tab;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
      const action = keyToAction(e.key);
      if (!action) return;
      e.preventDefault();
      dispatch(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const values = useMemo(() => graphValues(analysis.positions.map((p) => p.evaluation)), [analysis]);
  const { ply, orientation } = view;
  const position = analysis.positions[ply];
  const fen = position.fen;
  const move = ply > 0 ? review.moves[ply - 1] : undefined;
  const parsed = ply > 0 ? analysis.game.moves[ply - 1] : undefined;

  const explanation = useMemo(
    () => (move && parsed ? explainMove(move, parsed.fenBefore, ply > 1 ? review.moves[ply - 2] : undefined) : []),
    [move, parsed, ply, review.moves],
  );
  const captured = useMemo(() => capturedPieces(fen), [fen]);
  const sideToMove: Color = fen.split(" ")[1] === "b" ? "b" : "w";
  const check = useMemo(() => (new Chess(fen).inCheck() ? sideToMove : undefined), [fen, sideToMove]);
  const lastMove = useMemo<[string, string] | undefined>(() => (parsed ? [parsed.from, parsed.to] : undefined), [parsed]);
  const arrow = useMemo(
    () => (move && !move.isEngineBest && move.bestMove ? { from: move.bestMove.slice(0, 2), to: move.bestMove.slice(2, 4) } : undefined),
    [move],
  );
  const badge = useMemo(() => (move && parsed ? { square: parsed.to, classification: move.classification } : undefined), [move, parsed]);

  const top: Color = orientation === "w" ? "b" : "w";
  const bottom: Color = orientation;
  const bar = (color: Color) => (
    <PlayerBar
      color={color}
      player={review.players[color]}
      captured={captured.captured[color]}
      advantage={captured.advantage[color]}
      toMove={sideToMove === color}
    />
  );
  const select = (p: number) => dispatch({ type: "select", ply: p });
  const graph = <EvalGraph values={values} moves={review.moves} ply={ply} onSelect={select} height={wide ? 96 : 80} />;
  const tabs: { id: Tab; label: string }[] = [
    { id: "moves", label: "Moves" },
    { id: "stats", label: "Stats" },
    ...(wide ? [] : [{ id: "graph" as Tab, label: "Graph" }]),
  ];

  const h = review.headers;
  const subtitle = [h.Event && h.Event !== "?" ? h.Event : "", h.Date && !h.Date.startsWith("?") ? h.Date.replace(/\.\?\?/g, "") : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 md:py-6">
      <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-lg font-semibold md:text-xl">
          {review.players.w.name} <span className="text-muted">vs</span> {review.players.b.name}
          <span className="ml-2 font-mono text-base text-muted">{review.result}</span>
        </h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="mx-auto w-full md:max-w-[max(340px,calc(100dvh-13rem))]">
          {bar(top)}
          <div className="flex gap-1.5">
            <EvalBar whitePercent={values[ply]} score={position.evaluation} orientation={orientation} />
            <div className="min-w-0 flex-1">
              <Board
                fen={fen}
                orientation={orientation}
                lastMove={lastMove}
                check={check}
                arrow={arrow}
                badge={badge}
                onSwipe={(d) => dispatch({ type: d })}
              />
            </div>
          </div>
          {bar(bottom)}
          <div className="mt-2">
            <NavControls ply={ply} lastPly={lastPly} dispatch={dispatch} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <MovePanel review={review} move={move} explanation={explanation} />
          {wide && graph}
          <div className="rounded-lg border border-line bg-surface">
            <div role="tablist" aria-label="Review panels" className="flex border-b border-line">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={activeTab === t.id}
                  aria-controls={`panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`min-h-11 flex-1 px-3 text-sm font-medium ${
                    activeTab === t.id ? "border-b-2 border-accent text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="p-3">
              {activeTab === "moves" && <MoveList moves={review.moves} ply={ply} onSelect={select} />}
              {activeTab === "stats" && <StatsPanel review={review} />}
              {activeTab === "graph" && graph}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
