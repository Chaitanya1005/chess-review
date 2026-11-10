"use client";

import { useEffect, useRef, useState } from "react";
import { useGameAnalysis } from "@/hooks/useGameAnalysis";
import { formatScore } from "@/lib/analysis/evaluation";

const SAMPLE = `[Event "Paris"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7
14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

/** Measures main-thread responsiveness: frames rendered and the longest gap between frames. */
function useFrameMonitor(active: boolean) {
  const [stats, setStats] = useState({ frames: 0, maxGapMs: 0 });
  const ref = useRef({ frames: 0, maxGapMs: 0, last: 0 });
  useEffect(() => {
    if (!active) return;
    ref.current = { frames: 0, maxGapMs: 0, last: performance.now() };
    let id = 0;
    const tick = (now: number) => {
      const r = ref.current;
      r.maxGapMs = Math.max(r.maxGapMs, now - r.last);
      r.last = now;
      r.frames++;
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    const timer = setInterval(() => setStats({ frames: ref.current.frames, maxGapMs: Math.round(ref.current.maxGapMs) }), 250);
    return () => {
      cancelAnimationFrame(id);
      clearInterval(timer);
      setStats({ frames: ref.current.frames, maxGapMs: Math.round(ref.current.maxGapMs) });
    };
  }, [active]);
  return stats;
}

export function EngineDevPanel() {
  const [pgn, setPgn] = useState(SAMPLE);
  const [depth, setDepth] = useState(14);
  const { state, run, cancel } = useGameAnalysis();
  const busy = state.status === "loading-engine" || state.status === "analysing";
  const frames = useFrameMonitor(busy);
  const moves = state.analysis?.game.moves ?? [];

  return (
    <div className="space-y-4">
      <textarea
        aria-label="PGN"
        className="h-48 w-full rounded border border-neutral-300 bg-white p-2 font-mono text-sm text-neutral-900"
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          Depth{" "}
          <input
            type="number"
            min={1}
            max={30}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="w-16 rounded border border-neutral-300 bg-white px-1 text-neutral-900"
          />
        </label>
        <button
          className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
          onClick={() => run(pgn, { depth })}
          disabled={busy}
        >
          Analyse
        </button>
        {busy && (
          <button className="rounded border px-4 py-2" onClick={cancel}>
            Cancel
          </button>
        )}
        <span data-testid="status" className="text-sm">
          {state.status} {state.progress.total > 0 && `${state.progress.done}/${state.progress.total}`}
        </span>
        <span data-testid="frames" className="text-sm text-neutral-500">
          frames {frames.frames}, longest frame gap {frames.maxGapMs} ms
        </span>
      </div>
      {state.error && (
        <p role="alert" className="text-red-600">
          {state.error}
        </p>
      )}
      {state.warnings.map((w) => (
        <p key={w} className="text-amber-700">
          {w}
        </p>
      ))}
      {state.analysis && (
        <div className="overflow-x-auto">
          <p className="mb-2 text-sm" data-testid="summary">
            {state.analysis.settings.engine} · depth {state.analysis.settings.depth} · MultiPV {state.analysis.settings.multiPv} ·{" "}
            {state.analysis.durationMs} ms
          </p>
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-left">
                <th>Ply</th>
                <th>Move</th>
                <th>Eval (White)</th>
                <th>Best</th>
                <th>Depth</th>
                <th>Source</th>
                <th>PV</th>
              </tr>
            </thead>
            <tbody>
              {state.analysis.positions.map((p) => (
                <tr key={p.ply} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td>{p.ply}</td>
                  <td>{p.ply === 0 ? "start" : moves[p.ply - 1]?.san}</td>
                  <td>{formatScore(p.evaluation)}</td>
                  <td>{p.bestMove ?? (p.terminal ? p.terminal : "")}</td>
                  <td>{p.depth}</td>
                  <td>{p.source}</td>
                  <td className="max-w-xs truncate">{p.lines[0]?.pv.slice(0, 6).join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
