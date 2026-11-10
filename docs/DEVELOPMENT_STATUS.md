# Development Status

_Last updated: 2026-11-11_

## Current phase

- Phase 1 — Engine prototype: **complete** (commit `56dd4af`).
- Phase 2 — Analysis algorithm: **complete** (commit `c33f1d9`). Not yet benchmarked against Chess.com.
- Phase 3 — Frontend: **complete. The end-to-end review works in a real browser (static export), desktop, tablet and phone widths. Not committed yet.**
- Next: **Phase 4 — Benchmarking.**

## Phase 3 acceptance (PRODUCT_REQUIREMENTS.md §5)

| Criterion | Status | Evidence |
|---|---|---|
| 1. A pasted/uploaded PGN gives a full review with no backend calls | ✅ | Browser run (static export via `python -m http.server`): every resource request went to `localhost:4173` (Performance API resource list), no other origin. Upload covered by a component test (FileReader in jsdom). |
| 2. Every mainline move is listed with exactly one classification | ✅ | `ReviewView.test.tsx` (34 buttons, one label each); browser runs. |
| 3. Board, move list, graph and explanation show the same ply | ✅ | One reducer holds the selected ply. `ReviewView.test.tsx` checks board FEN, selected move and panel after keyboard, buttons and clicks. In the browser: graph click selected ply 24, and the list, board and panel followed. |
| 4. Stats counts equal the classifications in the move list | ✅ | `ReviewView.test.tsx` compares every count cell with the move list. The browser counts equal the CLI output for the Opera Game. |
| 5. Accuracy within [0, 100] | ✅ | Phase 2 tests; browser shows the same values as the CLI. |
| 6. UI responsive during analysis (no long task > 200 ms) | ✅ (desktop) | Kasparov–Topalov in the browser: one long task of 117 ms in total (PerformanceObserver `longtask`), measured while the pane was visible. |
| 7. Usable at 375 / 768 / 1280 px | ✅ | Checked at 375×812 (no horizontal scroll after the coordinate fix), 768×1024 and an 800 px-wide desktop pane. MOB-1 stacking order and 44 px buttons (MOB-2). Not tested on real phones. |
| 8. Invalid PGNs give specific errors and never crash | ✅ | Browser: empty input → "Paste a PGN or choose a file."; `1. e4 e5 2. Ke3` → "Illegal or unreadable move at 2. Ke3." Component tests cover variants and non-PGN files. |

## Completed in Phase 3

- **Homepage** (`src/app/page.tsx`, `components/home/HomeClient.tsx`): PGN textarea, file upload (FileReader, 1 MB and type checks), validation with `parsePgn` before navigating, analysis presets Fast 12 / Standard 16 / Deep 18 (D-021), three sample games. The PGN goes to `/review/` via sessionStorage (with an in-memory fallback) and is restored when you come back.
- **Review route** (`components/review/ReviewScreen.tsx`): lazy-loads the engine, progress bar ("Analysing position N of M"), cancel, error and retry, a "tab was in the background" notice (MOB-4), and the multi-game warning.
- **Review screen** (`ReviewView.tsx`):
  - View-only Chessground board: last-move highlight, check highlight, best-move arrow when the move was not best, classification badge on the destination square, flip, swipe (D-022).
  - Evaluation bar.
  - Player bars: name, PGN rating, accuracy, captured pieces and material difference.
  - Navigation buttons and keyboard: ←/→, Home/End, ↑/↓, F.
  - Selected-move panel: label, evaluation before → after, best move, deterministic explanation, engine lines in numbered SAN.
  - SVG evaluation graph on the win-probability scale, with markers, click/tap to select and a cursor.
  - Move list with icons that auto-scrolls.
  - Stats: accuracy, estimated game rating marked **Experimental**, classification counts, accuracy by phase, method disclaimer and the settings used.
- **Explanations** (`src/lib/review/explainMove.ts`, D-025; ANALYSIS_ENGINE.md §12a).
- **Pure UI helpers** in `src/lib/review/`: `evalGraph`, `capturedPieces`, `navigation`, `presets`, `formatLine`, `classificationInfo`. `src/lib/pgn/fileCheck.ts`, `samples.ts`.
- **Layout and footer:** GPL notice, source link, Stockfish / Stockfish.js / Chessground credits, "Not affiliated with Chess.com or Lichess".
- **Hook fixes** (`useGameAnalysis`): stale runs (StrictMode double mount, rapid restarts) no longer write state or dispose the new engine. The engine ref is cleared on unmount.
- **Static export:** `trailingSlash: true` (D-024).
- **Docs:** D-021…D-025, THIRD_PARTY_NOTICES (Chessground, cburnett pieces), TECHNICAL_ARCHITECTURE, ANALYSIS_ENGINE §12a, README.

## End-to-end browser runs (2026-11-11, static export, this Mac)

| Game | Preset | Viewport | Result |
|---|---|---|---|
| Opera Game | Standard (16) | 800×600 | Review rendered; accuracy 98.2 / 82.4, same as the CLI. Qb8+ Brilliant with the sacrifice explanation; 6...Nf6 Mistake with the Qf6 arrow and "This loses a pawn"; checked Stats, graph click, keyboard. No console errors. |
| Kasparov–Topalov | Standard (16) | 800×600 → 768×1024 | 29.9 s from click to review (88 positions); 95.6 / 89.1, same as the CLI; one long task, 117 ms. Flip checked (eval bar and player bars swap). 25.Re7+ Brilliant. A second run in a hidden pane was much slower (browser throttling), as expected. |
| Légal's mate | Fast (12) | 375×812 | 95.4 / 50.9 (depth 12; depth 16 gives 95.9 / 51.8). 5.Nxe5 Brilliant. No horizontal scroll. |

## Tests (last run 2026-11-11)

`npm test`: **17 files, 155 tests, all passing.** `npm run typecheck`, `npm run lint`, `npm run build`: clean.

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
| `explainMove.test.ts` | 19 | unit (frozen Opera analysis + hand positions) |
| `reviewUi.test.ts` | 13 | unit (graph, captures, navigation, presets, file checks) |
| `components/HomeClient.test.tsx` | 7 | component (jsdom) |
| `components/ReviewScreen.test.tsx` | 4 | component (engine hook mocked) |
| `components/ReviewView.test.tsx` | 7 | component (real Chessground, frozen analysis) |
| `components/MoveList.test.tsx` | 1 | component |
| `engine.integration.test.ts` | 6 | real Stockfish WASM |
| `review.integration.test.ts` | 5 | real Stockfish WASM, depth 16 |

## Known issues

1. **Nothing is calibrated against Chess.com yet.** Thresholds, the Great/Brilliant/Miss rules and the EP model are documented approximations (ANALYSIS_ENGINE.md). The UI says so in the Stats panel and on the homepage.
2. **The game-rating table is a placeholder** (`calibrated: false`). It is shown as "Estimated game rating — Experimental" with a note that it is not an Elo, FIDE or any site's rating.
3. **Algorithmic finding (Phase 3, not changed):** a move in an already lost position that allows a forced mate can still be labelled Good. Example: 15...Nxd7 in the Opera Game allows mate in 2, but Black's EP was already ≈ 0.02 at −11, so the loss is below the Good threshold. The explanation does say "This allows a forced mate in 2." This follows from the EP model (D-009). To evaluate in Phase 4: whether Chess.com marks such moves worse, and whether "allows mate" should cap the label.
4. **Great may still be generous in forcing sequences** (Kasparov's 27.b4+, 34.Qa1+, 35.Qb2+). Needs reference data (D-019).
5. **Knight-for-two-pawns sacrifices are not Brilliant** (net −1 < `sacrificeMinValue` 2), e.g. 10.Nxb5 in the Opera Game. Deliberately conservative.
6. **Completely-winning thresholds sit high on the Lichess curve** (EP 0.95 ≈ +8 pawns).
7. **Explanation material statements follow the engine's line**, which may stop at a different point than a human would. Example: for 5.Nxe5 (Légal) the text says it "gives up the knight", because the engine's line takes the knight, not the queen.
8. Depth 14 can miss sacrificial mates (D-017). The UI defaults to 16 (D-021). Mobile timings are not measured.
9. Cache ignores move history (D-007). The cache lives in the review page, so reloading the page re-analyses.
10. **Not tested:** real phones, Safari, Firefox, screen readers. No automated browser end-to-end test (D-023); the browser runs above were done by hand.
11. Captured pieces are derived from the position compared with the standard set. For custom start positions they are approximate.
12. `npm audit --omit=dev`: 0 vulnerabilities (re-run 2026-11-11). Moderate findings remain in dev-only tooling.

## Phase 4 — next actionable tasks

1. Collect 100–500 games with Chess.com reviews entered by hand: labels per move, accuracy, game rating (BENCHMARKING.md).
2. Freeze the engine output per game (`npm run analyze -- --out`) and write the agreement metrics script.
3. Depth study (12 / 16 / 18) for label stability and timing, including a mid-range phone.
4. Fit the rating table (D-012) and re-check the Great/Brilliant/Miss rules and known issue 3 against the data.
5. Consider a Playwright smoke test of the full journey before launch (D-023).
