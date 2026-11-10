# Development Status

_Last updated: 2026-11-10_

## Current phase

**Phase 1 — Engine prototype: complete (verified).** Next: **Phase 2 — Analysis algorithm.**

## Phase 1 acceptance criteria

| Criterion | Status | Evidence |
|---|---|---|
| Valid PGN is parsed correctly | ✅ | `tests/parsePgn.test.ts` (headers, SAN→UCI, FEN chain, promotions, custom FEN with Black to move, comments/NAGs/variations, multi-game, CRLF). |
| Every legal move is represented correctly | ✅ | FEN chain test; real-engine tests check every best move and PV head is legal in its position. |
| Evaluations are associated with the correct positions | ✅ | Integration test: `positions[i].fen` equals the FEN after ply *i*; mate-in-1 found at ply 6 of Scholar's mate with best move `h5f7`. |
| Evaluation perspective is consistent | ✅ | Unit tests for `toWhitePov`; integration test with White up a queen gives White-positive scores and WDL with both sides to move. |
| Best moves are returned | ✅ | Integration tests. |
| Analysis does not freeze the main UI thread | ✅ | Browser (static export, `/dev/engine`): **0 long tasks ≥ 50 ms** on the main thread during a full depth-16 analysis (16.2 s). The engine is fetched only when analysis starts. |
| Engine can analyse a complete game without crashing | ✅ | Opera Game (33 moves, 34 positions) at depth 10 (tests) and depth 14/16 (browser). |
| Invalid PGNs and engine failures handled | ✅ | PGN error tests; `UciEngine` tests for timeout→stop, unresponsive engine, abort, worker crash, load failure. Browser shows "Illegal or unreadable move at 2. Ke3." |

## Completed

- Docs: `PROJECT_BRIEF`, `PRODUCT_REQUIREMENTS`, `TECHNICAL_ARCHITECTURE`, `ANALYSIS_ENGINE`, `BENCHMARKING`, `DECISIONS` (D-001…D-018), this file; root `CLAUDE.md`, `README.md`, `LICENSE` (GPLv3), `THIRD_PARTY_NOTICES.md`.
- Project: Next.js 16.4.6 static export, React 19.3, TypeScript strict, Tailwind 4.3, ESLint, Vitest 4.1.
- Engine: Stockfish.js 19.0.1 lite single-threaded, copied to `public/engine/` by `scripts/copy-engine.mjs` (postinstall / predev / prebuild).
- `src/lib/pgn/parsePgn.ts` — PGN → `ParsedGame` with readable errors.
- `src/lib/engine/` — `uci.ts` (pure parsers), `UciEngine.ts` (handshake, queue, MultiPV, timeouts, stop, abort, failure handling), `browserTransport.ts` (Worker), `nodeTransport.ts` (same WASM in Node).
- `src/lib/analysis/` — `evaluation.ts` (White-POV normalisation, formatting), `analyzeGame.ts` (per-position pipeline, rules for terminal positions, session cache, progress, cancellation).
- `src/hooks/useGameAnalysis.ts` — engine lifetime in React (lazy load, recreate after failure, dispose on unmount).
- `/dev/engine` developer page showing raw analysis.

## Tests (last run 2026-11-10)

`npm test`: **5 files, 38 tests, all passing** (≈1.3 s; integration tests run the real WASM engine at depth 8–10).

| File | Tests | Kind |
|---|---|---|
| `tests/uci.test.ts` | 8 | unit |
| `tests/evaluation.test.ts` | 7 | unit |
| `tests/parsePgn.test.ts` | 9 | unit |
| `tests/UciEngine.test.ts` | 8 | protocol, fake transport |
| `tests/engine.integration.test.ts` | 6 | real Stockfish 19 WASM in Node |

Also clean: `npm run typecheck`, `npm run lint`, `npm run build`. No coverage tool is configured yet.

## Known issues

1. **Depth 14 can miss sacrificial mates** with the lite net (D-017: Opera Game, 15...Nxd7 allows Qb8+! mate; seen only from depth 15). This matters for Brilliant/Great/Miss accuracy. To be decided with data in Phase 4.
2. **Cache ignores move history** (D-007): a FEN repeated within a game reuses its first result.
3. **The browser "frames" counter on the dev page is unreliable in background tabs** (rAF is throttled). Long-task measurement is the real check.
4. **`npm audit`: 7 moderate findings in the dev-only ESLint dependency chain** (`minimatch` via `@typescript-eslint`). Production dependencies: 0.
5. Mobile browsers and Safari/Firefox are not tested yet (only the Chromium-based app browser and Node).
6. Vitest warns that `vitest.config.ts` is ESM in a CommonJS package. Harmless; fix by renaming to `.mts` or adding `"type": "module"`.
7. The repository has no commits yet; nothing is pushed to GitHub.

## Phase 2 — next actionable tasks

1. `src/lib/analysis/config.ts` with `cls-v1` (values in ANALYSIS_ENGINE §13).
2. `expectedPoints.ts` — logistic EP, mover perspective, mate edges; property tests.
3. `moveClassification.ts` — base thresholds, then Great, Brilliant (with `sacrifice.ts`), Miss; fixture-based tests.
4. `accuracy.ts` — per-move curve, windows, volatility weights, weighted + harmonic means; bounds tests.
5. `gamePhases.ts`, `gameStatistics.ts` (counts reconcile with classifications), `performanceRating.ts` (uncalibrated seed table, flagged).
6. `buildReview(GameAnalysis) → GameReview`, plus golden-file tests on frozen engine output.
7. A Node CLI (`scripts/analyze-pgn`) that writes frozen `GameAnalysis` JSON for the benchmark harness.
