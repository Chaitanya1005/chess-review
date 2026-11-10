# Development Status

_Last updated: 2026-11-10_

## Current phase

- Phase 1 — Engine prototype: **complete** (commit `56dd4af`).
- Phase 2 — Analysis algorithm: **complete (verified by tests and real-game runs; not yet benchmarked against Chess.com).**
- Next: **Phase 3 — Frontend.**

## Phase 2 acceptance criteria

| Criterion | Status | Evidence |
|---|---|---|
| Both players are evaluated correctly | ✅ | Unit tests compute EP loss from each mover's perspective; integration: Morphy's accuracy > his opponents', no Black Brilliants in the Opera Game. |
| No confusion of player perspectives | ✅ | `expectedPoints` symmetry tests; Black-move loss tests; Miss test where White errs and Black gives it back. |
| Classifications are deterministic | ✅ | Determinism tests (fixture and real-engine `buildReview` twice → deep-equal). |
| Accuracy bounded 0–100 | ✅ | Curve monotonic/bounded tests; 50 random games; real games. |
| Statistics reconcile with classifications | ✅ | `playerStats` test; integration test checks counts and phase totals per player against the move list. |
| Important edge cases tested | ✅ | Threshold boundaries ±ε, engine-best with eval noise, improving moves, recaptures, check responses, forced mates, delivered mate, already-hanging pieces, trades vs sacrifices, players with no moves, mismatched inputs. |

## Completed in Phase 2

- `src/lib/analysis/config.ts` — `REVIEW_CONFIG`, version `cls-v1`.
- `expectedPoints.ts` — Lichess logistic EP, mover perspective, mate handling.
- `material.ts` — material balance, piece counts, UCI→SAN lines.
- `sacrifice.ts` — PV-accepted and statically-offered sacrifice detection.
- `moveClassification.ts` — base thresholds + Brilliant / Great / Miss rules.
- `accuracy.ts` — per-move accuracy, volatility windows, weighted + harmonic mean.
- `gamePhases.ts`, `gameStatistics.ts`, `performanceRating.ts` (placeholder table, `calibrated: false`).
- `src/lib/review/buildReview.ts` — `GameAnalysis` → `GameReview` (per-move data incl. SAN best move and lines for explanations; per-player accuracy, rating, counts, phase breakdowns).
- `scripts/analyze-pgn.ts` (`npm run analyze`) — full review in Node, `--out` freezes `{analysis, review}` JSON for benchmarking.
- Sample PGNs in `benchmarks/games/`.

## Real-game sanity runs (depth 16, MultiPV 2, cls-v1)

Not a benchmark: no Chess.com reference values yet.

| Game | White acc. | Black acc. | Notable labels |
|---|---|---|---|
| Opera Game (Morphy, 1858) | 98.2 | 82.4 | 16.Qb8+ Brilliant, 14.Rd1 Great, 3...Bg4 Inaccuracy, 6...Nf6 Mistake, 17.Rd8# Best |
| Légal's mate pattern | 95.9 | 51.8 | 4...g6 Mistake, 5.Nxe5 Brilliant, 5...Bxd1 Blunder |
| Kasparov–Topalov 1999 | 95.6 | 89.1 | 25.Re7+, 30.Rxb7, 36.Bf1, 37.Rd7 Brilliant; 7 White / 4 Black Greats |

Timing (this Mac, Node): Opera 15.6 s, Kasparov–Topalov (88 positions) 30.7 s at depth 16.

## Tests (last run 2026-11-10)

`npm test`: **11 files, 104 tests, all passing.** Typecheck, lint: clean.

| File | Tests | Kind |
|---|---|---|
| `uci.test.ts` | 8 | unit |
| `evaluation.test.ts` | 7 | unit |
| `parsePgn.test.ts` | 9 | unit |
| `UciEngine.test.ts` | 8 | protocol (fake transport) |
| `expectedPoints.test.ts` | 7 | unit |
| `accuracy.test.ts` | 9 | unit + randomised bounds |
| `sacrifice.test.ts` | 8 | unit (real positions) |
| `moveClassification.test.ts` | 30 | unit (hand-made analyses) |
| `phasesAndRating.test.ts` | 7 | unit |
| `engine.integration.test.ts` | 6 | real Stockfish WASM |
| `review.integration.test.ts` | 5 | real Stockfish WASM, depth 16 |

## Known issues

1. **Nothing is calibrated against Chess.com yet.** Thresholds, Great/Brilliant/Miss rules and the EP model are documented approximations (ANALYSIS_ENGINE.md).
2. **The game-rating table is a placeholder** (`calibrated: false`). The UI must show it as experimental until Phase 4 fits it.
3. **Great may still be generous in forcing sequences** (e.g. Kasparov's checks 27.b4+, 34.Qa1+, 35.Qb2+). Needs reference data (D-019).
4. **Knight-for-two-pawns sacrifices are not Brilliant** (net −1 < `sacrificeMinValue` 2), e.g. 10.Nxb5 in the Opera Game. Deliberately conservative; to check against Chess.com.
5. **Completely-winning thresholds sit high on the Lichess curve** (EP 0.95 ≈ +8 pawns). Brilliants at +7 are still possible (D-009 validation).
6. Depth 14 can miss sacrificial mates (D-017); the review integration test uses depth 16.
7. Cache ignores move history (D-007).
8. `npm audit`: moderate findings in dev-only tooling; production dependencies: 0.
9. Not yet tested on mobile, Safari or Firefox.
10. Explanations (FR-EXP) are not written yet; `MoveReview` carries the inputs (best move SAN, both lines in SAN, EP before/after, reasons).

## Phase 3 — next actionable tasks

1. Homepage: PGN textarea, file upload (FileReader), validation errors, "Review game".
2. Review route: `useGameAnalysis` + `buildReview`, progress bar, cancel, error/retry.
3. Board (validate Chessground, D-014): navigation (buttons + keyboard), flip, last-move highlight, best-move arrow, classification badge.
4. Move list with classification icons, synced with board and graph.
5. Evaluation graph (SVG, win-probability scale, markers, click to select).
6. Player panels: accuracy, estimated game rating (marked experimental), counts, phase breakdown.
7. Deterministic explanation templates from `MoveReview`.
8. Responsive layout (375 / 768 / 1280 px) and an openly licensed piece set (record in THIRD_PARTY_NOTICES.md).
