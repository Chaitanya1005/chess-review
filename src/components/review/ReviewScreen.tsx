"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameAnalysis } from "@/hooks/useGameAnalysis";
import { loadPendingGame, type PendingGame } from "@/hooks/pendingGame";
import { parsePgn } from "@/lib/pgn/parsePgn";
import type { ParsedGame } from "@/lib/pgn/types";
import { buildReview } from "@/lib/review/buildReview";
import { ANALYSIS_MULTI_PV, presetById } from "@/lib/review/presets";
import { ReviewView } from "./ReviewView";

/**
 * The /review route: reads the game handed over by the homepage, runs the engine with progress
 * and cancel, then shows the review. Errors offer a retry (TECHNICAL_ARCHITECTURE.md §10, PRD §4).
 */
export function ReviewScreen() {
  const [pending, setPending] = useState<PendingGame | null | undefined>(undefined);
  const { state, run, cancel } = useGameAnalysis();
  const [pausedNotice, setPausedNotice] = useState(false);

  useEffect(() => {
    // sessionStorage is only available in the browser, after the static HTML has loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(loadPendingGame());
  }, []);

  const preset = presetById(pending?.presetId);
  const game = useMemo<ParsedGame | null>(() => {
    if (!pending) return null;
    try {
      return parsePgn(pending.pgn);
    } catch {
      return null;
    }
  }, [pending]);

  const start = useCallback(() => {
    if (!pending) return;
    setPausedNotice(false);
    void run(pending.pgn, { depth: preset.depth, multiPv: ANALYSIS_MULTI_PV });
  }, [pending, preset.depth, run]);

  // Starting the engine is synchronising with an external system (the Worker); the run then
  // reports progress into React state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pending) start();
  }, [pending, start]);

  // MOB-4: tell the user if the tab was hidden mid-analysis (mobile browsers may pause it).
  const busy = state.status === "loading-engine" || state.status === "analysing";
  useEffect(() => {
    if (!busy) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") setPausedNotice(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [busy]);

  const review = useMemo(() => (state.analysis ? buildReview(state.analysis) : null), [state.analysis]);

  if (pending === undefined) return <Centered>Loading…</Centered>;
  if (pending === null) {
    return (
      <Centered>
        <h1 className="text-lg font-semibold">No game to review</h1>
        <p className="mt-2 text-sm text-muted">Paste a PGN on the homepage to start a review.</p>
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-accent px-4 font-medium text-accent-foreground">
          Go to the homepage
        </Link>
      </Centered>
    );
  }

  if (state.status === "done" && state.analysis && review) {
    return (
      <>
        {state.warnings.length > 0 && (
          <div className="mx-auto mt-4 w-full max-w-6xl px-4">
            <p role="status" className="rounded-md border border-[#fcd34d] bg-[#fffbeb] px-3 py-2 text-sm text-[#78350f]">
              {state.warnings.join(" ")}
            </p>
          </div>
        )}
        <ReviewView analysis={state.analysis} review={review} />
      </>
    );
  }

  const players = game ? `${game.headers.White ?? "White"} vs ${game.headers.Black ?? "Black"}` : "Your game";
  const { done, total } = state.progress;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  if (state.status === "error" || state.status === "cancelled") {
    return (
      <Centered>
        <h1 className="text-lg font-semibold">{state.status === "cancelled" ? "Analysis cancelled" : "The review could not be completed"}</h1>
        {state.error && (
          <p role="alert" className="mt-2 text-sm text-[#b91c1c] dark:text-[#fca5a5]">
            {state.error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {game && (
            <button type="button" onClick={start} className="min-h-11 rounded-md bg-accent px-4 font-medium text-accent-foreground">
              {state.status === "cancelled" ? "Start again" : "Retry"}
            </button>
          )}
          <Link href="/" className="inline-flex min-h-11 items-center rounded-md border border-line px-4 font-medium">
            Edit the PGN
          </Link>
        </div>
      </Centered>
    );
  }

  return (
    <Centered>
      <h1 className="text-lg font-semibold">{players}</h1>
      <p className="mt-1 text-sm text-muted">
        {state.status === "analysing" ? `Analysing position ${Math.min(done + 1, total)} of ${total}` : "Loading the Stockfish engine…"}
      </p>
      <div
        className="mt-5 h-2.5 w-full max-w-sm overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label="Analysis progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs tabular-nums text-muted">{percent}%</p>
      <p className="mt-4 max-w-sm text-xs text-muted">
        Stockfish runs on your device ({preset.label.toLowerCase()} analysis, depth {preset.depth}). Your game is not uploaded anywhere.
      </p>
      {pausedNotice && (
        <p role="status" className="mt-3 max-w-sm text-xs text-[#92400e] dark:text-[#fcd34d]">
          This tab was in the background, so your browser may have paused the analysis. If the progress bar has stopped moving,
          cancel and start again.
        </p>
      )}
      <button type="button" onClick={cancel} className="mt-5 min-h-11 rounded-md border border-line px-4 font-medium">
        Cancel
      </button>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">{children}</div>;
}
