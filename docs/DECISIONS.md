# Decisions

A chronological log. New decisions go at the bottom. Do not edit or delete earlier entries; if one is reversed, add a new entry that says it **supersedes** the old one, and mark the old one's status.

Format: ID · date · status (Accepted / Superseded by D-xxx / Needs validation) · decision · reasons · rejected alternatives.

---

### D-001 · 2026-11-10 · Accepted — Browser-only architecture, static hosting

All parsing, engine analysis and scoring run in the browser. The site is a Next.js static export.

- Why: near-zero operating cost, privacy (games never leave the device), no scaling problem (every user brings their own CPU).
- Rejected: server-side Stockfish (cost scales with users, needs queueing); a hybrid cache server (no requirement yet).

### D-002 · 2026-11-10 · Accepted — Stockfish.js 19.0.1, lite single-threaded build

Use npm `stockfish@19.0.1` (Stockfish 19), file `stockfish-19-lite-single.{js,wasm}` (≈1.9 MB).

- Why: smallest WASM build; no cross-origin isolation (COOP/COEP) needed; runs on all modern desktop and mobile browsers per its README; same build available in Node, so tests and benchmarks use exactly the engine users run. Verified locally in Node on 2026-11-10: `uciok`, `readyok`, depth-12 search with WDL output.
- Rejected: full NNUE builds (≈94 MB download); multi-threaded builds (need COOP/COEP; complicate hosting and third-party embeds — kept as a future optional mode); ASM.js build (slow, weak; last-resort fallback only); Lichess `stockfish-web` builds (good, but the npm `stockfish` package is simpler to consume, and its README says it is written for Chess.com's in-browser analysis, which may reduce engine disagreement in benchmarks; unverified).
- Needs validation (Phase 4): whether the lite net's evaluations differ from Chess.com's enough to hurt classification agreement. If so, consider an optional full-net download.

### D-003 · 2026-11-10 · Accepted — chess.js for rules and PGN

`chess.js@1.4.0` (BSD-2-Clause). Gives PGN parsing with mainline extraction, verbose move history with before/after FEN, and game-over detection.

- Rejected: `chessops` (GPL-3.0, very good, but chess.js is simpler for our needs and has a permissive licence).

### D-004 · 2026-11-10 · Accepted — Project licence GPL-3.0-or-later

- Why: we redistribute Stockfish (GPL-3.0) and intend to bundle Chessground (GPL-3.0-or-later). A GPL licence for the whole project is the simplest compliant choice and fits the open-source goal.
- Obligations: ship `LICENSE`, `THIRD_PARTY_NOTICES.md`, a notice in the site footer, and source links for the exact engine release.
- Rejected: MIT for our own code with GPL engine as a separate "aggregate" (legally arguable, but confusing for contributors once Chessground is bundled).

### D-005 · 2026-11-10 · Accepted — Engine-agnostic analysis via `EngineTransport` + `UciEngine`

The analysis pipeline depends on an `AnalysisEngine` interface (`analyse(position, options)`). `UciEngine` implements it over any `EngineTransport` (browser Worker or Node). Classification code consumes `PositionAnalysis` objects only.

- Why: required by the brief; makes it possible to test classification without an engine and to run benchmarks in Node.

### D-006 · 2026-11-10 · Accepted — Evaluations stored in White's perspective

UCI scores (side-to-move POV) are converted to White POV in exactly one function, right after parsing. All stored data is White POV; mover-perspective values are derived when needed.

- Why: perspective errors are the most common bug class in game review tools; one conversion point prevents them.

### D-007 · 2026-11-10 · Accepted — Send move history to the engine

Positions are sent as `position fen <startFen> moves …` rather than a bare FEN.

- Why: the engine can see repetitions and the fifty-move counter correctly.
- Trade-off: the per-session cache keys on FEN, so a repeated position reuses the first result.

### D-008 · 2026-11-10 · Needs validation (Phase 4) — Default analysis settings: depth 14, MultiPV 2, Hash 32 MB

- Why: depth 14 on the lite net is fast enough for a full game in about a minute on a laptop; MultiPV 2 is the minimum needed for only-move (Great) detection.
- Validate: depth study (14 / 18 / 22) for label stability and Chess.com agreement; mobile timing.

### D-009 · 2026-11-10 · Needs validation (Phase 4) — Expected points: Lichess logistic curve, rating-independent

`EP = 1/(1+exp(−0.00368208·cp))`, cp clamped to ±1000. Chess.com's model is rating-dependent and unpublished. Ours is a documented approximation.

- Alternatives to test: rating-dependent coefficient; Stockfish WDL-derived EP.

### D-010 · 2026-11-10 · Accepted — Classification thresholds from Chess.com's public table

Best 0 / Excellent ≤0.02 / Good ≤0.05 / Inaccuracy ≤0.10 / Mistake ≤0.20 / Blunder >0.20 EP lost. Great, Brilliant and Miss rules are our own (see `ANALYSIS_ENGINE.md` §6.3), versioned as `cls-v1`.

### D-011 · 2026-11-10 · Accepted — Accuracy: Lichess-published method

Win%-drop per-move accuracy curve with volatility-weighted and harmonic means. CAPS2 is unpublished and not reproduced. A calibration step may be added only if fitted from benchmark data.

### D-012 · 2026-11-10 · Needs validation (Phase 4) — Game rating: accuracy-to-rating table, uncalibrated until Phase 4

Shown as "Estimated game rating (experimental)" until the table is fitted to benchmark data.

### D-013 · 2026-11-10 · Accepted — Vitest for tests; real-engine integration tests in Node

Integration tests load the same WASM engine through `createNodeTransport()`.

### D-014 · 2026-11-10 · Needs validation (Phase 3) — Chessground for the board, custom SVG for the graph

Fallbacks: `react-chessboard` (MIT) and Recharts (MIT).

### D-015 · 2026-11-10 · Accepted — No global state library

React `useReducer` + context. One review at a time does not justify Redux/Zustand.

### D-016 · 2026-11-10 · Accepted — Engine files copied from `node_modules` at install/build time

`scripts/copy-engine.mjs` copies the two engine files to `public/engine/`. They are git-ignored, so the repository does not carry 1.9 MB binaries and the npm version pin is the single source of truth.

### D-017 · 2026-11-10 · Needs validation (Phase 4) — Evidence on D-008: depth 14 misses a 3-ply queen-sacrifice mate

Observed in the Opera Game (Morphy 1858), position after 15.Bxd7+ (`4kb1r/p2B1ppp/4qn2/4p1B1/4P3/1Q6/PPP2PPP/2KR4 b k - 0 15`). Up to depth 14 the lite engine prefers 15...Nxd7 (≈ −3 for Black) and does not see 16.Qb8+! Nxb8 17.Rd8#. At depth 15–16 it switches to 15...Qxd7 (−10.9 to −11.4). D-008 stays as it is for now, but this is direct evidence that depth 14 can misjudge sacrificial lines, which matters for Brilliant/Great/Miss. To evaluate in Phase 4: depth 16+ default, or a deeper re-search of "critical" positions only (large EP swing between consecutive positions).

Measured timings for that 33-move game (34 positions, MultiPV 2, this development Mac, Apple Silicon): Node depth 14 = 3.8 s; browser Worker depth 14 = 3.8 s; browser Worker depth 16 = 16.2 s. Mobile is not measured yet.

### D-018 · 2026-11-10 · Accepted — Threefold / fifty-move positions are scored by the engine, not by rules

Only checkmate, stalemate and insufficient material are terminal by rules. Repetition and fifty-move draws are claimable rather than automatic in OTB games; the engine sees the history (D-007) and scores them itself.
