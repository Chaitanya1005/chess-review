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

### D-019 · 2026-11-10 · Accepted — `cls-v1` finalised after real-game sanity checks (not a benchmark)

The first draft of the Phase 2 rules was run on three real games at depth 16 (Opera Game 1858, Légal's mate pattern, Kasparov–Topalov 1999). Before any release, `cls-v1` was changed as follows, each in chess terms rather than fitted to these games:

- **Great:** excluded getting out of check, capturing the piece the opponent just moved, and continuing a forced mate the mover already had. Before: Kasparov–Topalov had 19 Greats (Black 13), mostly forced king moves and recaptures, and 17.Rd8# in the Opera Game was Great. After: 11 Greats (Black 4), Rd8# is Best.
- **Sacrifice detection:** ignore a lost piece that was already capturable before the move, and net out captured material in the static check. Before: 26.Qxd4+ (Kasparov) and 10.Nxb5 / 13.Rxd7 (Morphy) were Brilliant. After: Brilliants are 16.Qb8+ (Morphy), 5.Nxe5 (Légal), 25.Re7+, 30.Rxb7, 36.Bf1, 37.Rd7 (Kasparov).

These three games are not a benchmark: there is no Chess.com reference data for them yet. Whether Chess.com labels 10.Nxb5 or Kasparov's forcing checks (27.b4+, 34.Qa1+, 35.Qb2+) as Great/Brilliant is an open question for Phase 4.

### D-020 · 2026-11-10 · Accepted — `tsx` (dev only) for Node scripts

`scripts/analyze-pgn.ts` imports the same TypeScript modules as the app (extensionless imports). `tsx` runs them without a build step. MIT, dev dependency only; it is not shipped.

### D-021 · 2026-11-11 · Needs validation (Phase 4) — UI analysis presets; the UI defaults to depth 16

The homepage offers Fast (depth 12), **Standard (depth 16, default)** and Deep (depth 18), all MultiPV 2 (`src/lib/review/presets.ts`). The library default `DEFAULT_DEPTH = 14` (D-008) is unchanged, so the CLI and tests behave as before.

- Why: depth 14 misses sacrificial mates that decide Brilliant/Great/Miss (D-017). Depth 16 still meets NFR-4 on this Mac: Opera Game (34 positions) ≈ 16 s, Kasparov–Topalov (88 positions) 29.9 s in the browser Worker. Fast exists for slow phones (MOB-5); the review shows the depth used (NFR-10).
- Validate: mobile timings; whether Standard should drop to 14 on low-end devices.

### D-022 · 2026-11-11 · Accepted — D-014 validated: Chessground board, custom SVG graph

`@lichess-org/chessground@10.5.0` works as a view-only board in a client component (created in `useEffect`, reconfigured with `set()`, `redrawAll()` on resize). Pieces: the cburnett set embedded in Chessground's own CSS (GPL-2.0-or-later, see THIRD_PARTY_NOTICES.md); board colours: Chessground's brown theme. Coordinates are restyled in `globals.css` because the base CSS offsets them for Lichess's page layout. The evaluation graph is a hand-written SVG (`EvalGraph.tsx` + pure geometry in `src/lib/review/evalGraph.ts`); no chart library. Classification badges are our own coloured symbols (standard annotation marks !!, !, ?!, ?, ?? plus ★ ✓ ○ ×), not any site's icons.

### D-023 · 2026-11-11 · Accepted — Frontend tests: Vitest + jsdom + Testing Library (dev only)

`jsdom@31.0.0`, `@testing-library/react@16.3.3`, `@testing-library/dom@10.4.2`, all MIT, dev dependencies only. Component tests opt in with `// @vitest-environment jsdom`; the rest stay in Node. They render the real components (including Chessground) against a frozen depth-16 analysis (`tests/fixtures/opera-review.json`), so no engine is needed.

- Rejected for now: Playwright end-to-end tests (large browser download; the full journey is checked by hand in a real browser and recorded in DEVELOPMENT_STATUS.md). Revisit before launch (Phase 5).

### D-024 · 2026-11-11 · Accepted — `trailingSlash: true` in the static export

Routes are exported as `review/index.html`, so `/review/` works on any static host, including `python -m http.server`, without rewrite rules.

### D-025 · 2026-11-11 · Accepted — Deterministic explanation templates [OURS]

`src/lib/review/explainMove.ts` builds 1–4 sentences per move from the review data only: a sentence for the classification, forced-mate statements from the evaluations, material statements from replaying the engine's main lines (up to 6 plies, extended to the end of a capture sequence), and the expected-score drop for Inaccuracy/Mistake/Miss/Blunder. No language model or paid API (FR-EXP-4). Material wording describes the engine's continuation, not a proof.
