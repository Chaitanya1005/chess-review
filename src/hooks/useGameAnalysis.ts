"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeGame, createAnalysisCache, type AnalysisCache } from "@/lib/analysis/analyzeGame";
import type { GameAnalysis } from "@/lib/analysis/types";
import { createBrowserTransport } from "@/lib/engine/browserTransport";
import { EngineError } from "@/lib/engine/types";
import { UciEngine } from "@/lib/engine/UciEngine";
import { parsePgn } from "@/lib/pgn/parsePgn";
import { PgnError } from "@/lib/pgn/types";

export type AnalysisStatus = "idle" | "loading-engine" | "analysing" | "done" | "error" | "cancelled";

export interface AnalysisState {
  status: AnalysisStatus;
  progress: { done: number; total: number };
  analysis: GameAnalysis | null;
  error: string | null;
  warnings: string[];
}

const INITIAL: AnalysisState = { status: "idle", progress: { done: 0, total: 0 }, analysis: null, error: null, warnings: [] };

/**
 * Owns the engine lifetime for one page: lazy-loads the Worker on first use,
 * keeps a per-session cache, recreates the engine after a failure, terminates on unmount.
 */
export function useGameAnalysis() {
  const [state, setState] = useState<AnalysisState>(INITIAL);
  const engineRef = useRef<UciEngine | null>(null);
  const cacheRef = useRef<AnalysisCache>(createAnalysisCache());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      abortRef.current = null;
      engineRef.current?.dispose();
      // Cleared so a remount (React StrictMode runs effects twice in development) creates a new worker.
      engineRef.current = null;
    },
    [],
  );

  const run = useCallback(async (pgn: string, options: { depth?: number; multiPv?: number } = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    // A newer run (or unmount) replaces this one; its late results must not touch state or the engine.
    const stale = () => abortRef.current !== controller;

    let game;
    try {
      game = parsePgn(pgn);
    } catch (error) {
      setState({ ...INITIAL, status: "error", error: error instanceof PgnError ? error.message : String(error) });
      return;
    }

    setState({ ...INITIAL, status: "loading-engine", warnings: game.warnings, progress: { done: 0, total: game.moves.length + 1 } });
    try {
      if (!engineRef.current) {
        engineRef.current = new UciEngine(createBrowserTransport());
      }
      const engine = engineRef.current;
      await engine.init();
      if (stale()) return;
      setState((s) => ({ ...s, status: "analysing" }));
      const analysis = await analyzeGame(game, engine, {
        ...options,
        cache: cacheRef.current,
        signal: controller.signal,
        onProgress: ({ done, total }) => {
          if (!stale()) setState((s) => ({ ...s, progress: { done, total } }));
        },
      });
      if (stale()) return;
      setState((s) => ({ ...s, status: "done", analysis }));
    } catch (error) {
      if (stale()) return;
      if ((error as Error)?.name === "AbortError") {
        setState((s) => ({ ...s, status: "cancelled" }));
        return;
      }
      if (error instanceof EngineError) {
        // The engine is unusable after a failure; the next run creates a fresh worker.
        engineRef.current?.dispose();
        engineRef.current = null;
      }
      const message =
        error instanceof EngineError && error.code === "load-failed"
          ? "The analysis engine could not be loaded. Check your connection and try again."
          : `Analysis failed: ${(error as Error)?.message ?? String(error)}`;
      setState((s) => ({ ...s, status: "error", error: message }));
    }
  }, []);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { state, run, cancel };
}
