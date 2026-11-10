# Benchmarking

## 1. Objectives

1. Measure, with evidence, how closely our review matches Chess.com Game Review for classifications, accuracy and game rating.
2. Find out why results differ, and tell engine disagreement apart from classification-rule disagreement.
3. Make every change to thresholds or formulas measurable, and prevent regressions.

We publish the results, including the bad ones. No parity claim is made anywhere (README, website, announcements) unless a current benchmark report supports it, and the claim then quotes the metric ("classification agreement 78% on 500 games"), never "identical".

## 2. Chess.com as the reference

- Reference data is what Chess.com's Game Review displays for a game: each move's classification, each player's accuracy, game rating and counts.
- Chess.com's engine, depth and model are unknown and may change without notice. Each reference record stores the **capture date**. Reports compare against one capture period at a time.
- Reference data is collected manually or by the user from their own reviews. We do not scrape Chess.com or automate their site against their terms. The dataset stores PGNs plus numbers transcribed from reviews; no Chess.com assets or screenshots go into the repo.
- Games must be ones we are allowed to redistribute (the contributor's own games, or games whose PGNs are freely shareable). The reference values are factual measurements.

## 3. Dataset requirements

Target: 100 games for the first report, growing to 500.

Coverage quotas (approximate, for the first 100):

| Dimension | Buckets |
|---|---|
| Rating (average of both players) | <800, 800–1200, 1200–1600, 1600–2000, 2000+ (≥15 each) |
| Length | <25 moves, 25–50, >50 |
| Result | White win, Black win, draw (≥15 draws) |
| Character | tactical, positional, endgame-heavy |
| Events | games with blunders, games with Brilliant moves (≥15), games with Great moves, games with Misses |
| Time control | bullet, blitz, rapid, daily |
| Openings | at least 20 different ECO families |

## 4. Test case structure

```
benchmarks/
  games/<id>.pgn                       game (mainline only, headers kept)
  reference/<id>.json                  Chess.com values for that game
  engine-cache/<engineKey>/<id>.json   frozen GameAnalysis (our engine output)
  reports/<date>-<cls-version>.md      generated reports
```

`reference/<id>.json`:

```json
{
  "id": "g0001",
  "source": "chess.com-game-review",
  "capturedAt": "2026-11-15",
  "whiteRating": 1432,
  "blackRating": 1390,
  "timeControl": "600",
  "white": { "accuracy": 81.4, "gameRating": 1550 },
  "black": { "accuracy": 74.2, "gameRating": 1300 },
  "moves": [
    { "ply": 1, "san": "e4", "classification": "book" },
    { "ply": 17, "san": "Nxe5", "classification": "blunder", "bestMoveSan": "Bd3" }
  ],
  "notes": "optional free text"
}
```

`classification` uses our labels plus `book` (Chess.com marks opening-book moves; we exclude `book` plies from classification metrics until we add our own book detection).

## 5. Comparison methodology

1. Run our pipeline on each PGN with a fixed engine configuration (§6) and freeze the `GameAnalysis` into `engine-cache/`.
2. Run `buildReview` (any classification version) on the frozen analysis. This is fast and deterministic, so threshold experiments do not need the engine again.
3. Align moves by ply and verify SAN matches; drop the game and report it if alignment fails.
4. Compute the metrics (§7–§9) overall and per rating bucket, phase and time control.

## 6. Engine configuration controls

Every report records, and every comparison holds constant:

| Variable | Default |
|---|---|
| Engine | Stockfish 19, Stockfish.js 19.0.1, lite single-threaded |
| Depth | 14 (also run at 18 and 22 for the depth study) |
| MultiPV | 2 |
| Hash | 32 MB |
| Threads | 1 |
| Position input | `position fen <start> moves …` |
| POV | White, normalised by `toWhitePov` |
| Classification config | `cls-vN` |

`engineKey` = `sf19-lite-single_d14_mpv2_h32`.

## 7. Classification metrics

- **Agreement %:** plies where our label equals Chess.com's, over all comparable plies.
- **Per-category precision, recall and F1** for all nine labels.
- **Confusion matrix** (9×9, rows = Chess.com, columns = ours), raw counts and row-normalised.
- **Adjacent agreement:** agreement when neighbouring labels count as a near-miss (Best↔Excellent, Good↔Inaccuracy …), to separate "slightly off" from "wrong".
- **Count error:** per game and player, |our count − reference count| for Brilliant, Great, Mistake, Miss, Blunder.

## 8. Accuracy comparison

- Mean absolute error (MAE) and mean signed error (bias) of accuracy, per player-game.
- Pearson and Spearman correlation.
- MAE per rating bucket. A scatter plot of ours vs. Chess.com goes into the report.

## 9. Game-rating comparison

- MAE and bias of game rating.
- Correlation with Chess.com game rating and with the PGN header ratings.
- Calibration fitting (ANALYSIS_ENGINE §9) uses a train/test split (80/20, fixed seed). We report test-set error only.

## 10. Error analysis

For each disagreement we record a cause:

| Cause | How we detect it |
|---|---|
| **Engine disagreement** | Our best move differs from Chess.com's best move, or the evaluation sign/scale differs a lot. Re-run that position at depth 22: if the label changes, it is engine-driven. |
| **Threshold disagreement** | Same best move, EP loss within 0.01 of a threshold. |
| **Model disagreement** | Same best move but EP loss far from Chess.com's apparent category, which suggests the rating-dependent EP model. |
| **Special-rule disagreement** | Great / Brilliant / Miss differences: look at the sacrifice detector and the only-move gap. |
| **Book** | Reference says `book`. Excluded. |

Only after enough evidence points at one cause do we change a rule, and the change is recorded in `DECISIONS.md` with before/after metrics.

## 11. Report format

`benchmarks/reports/<date>-<cls-version>.md`:

1. Configuration (engine key, classification version, dataset size and capture period).
2. Headline table: classification agreement, adjacent agreement, accuracy MAE/bias, rating MAE/bias.
3. Per-category precision/recall/F1 table.
4. Confusion matrix.
5. Breakdowns by rating bucket, phase and time control.
6. Top disagreement causes, with example plies.
7. Changes since the previous report.

## 12. Improvement process

1. Pick the largest disagreement bucket from the latest report.
2. State a hypothesis, then change one thing (one threshold, one rule, or the EP model).
3. Re-run `buildReview` on the frozen analyses; compare on the training split.
4. If it improves the target metric and does not worsen others beyond agreed tolerance, confirm on the test split.
5. Bump `cls-vN`, record the decision and both reports.

Overfitting guard: no per-game special cases, and every rule must be expressible in chess terms in `ANALYSIS_ENGINE.md`.
