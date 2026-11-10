# Analysis Engine

This document defines how raw Stockfish output becomes a game review. It is the reference for every change to chess calculations. Read it before you edit anything in `src/lib/analysis/` or `src/lib/engine/`.

## 0. Sources and honesty rules

Each method below is tagged:

- **[CC-PUBLIC]** — stated in Chess.com's public help articles. We quote what they say and nothing more.
- **[LICHESS-PUBLIC]** — published by Lichess (documentation page or open-source code). We implement our own TypeScript from the published description and cite it. We do not copy AGPL code.
- **[OURS]** — our own design or assumption. It needs validating in Phase 4 benchmarking.

Chess.com's actual classification, accuracy (CAPS2) and game-rating algorithms are proprietary. Their help articles give categories, the expected-points thresholds and a qualitative description of the special labels. They do **not** publish the expected-points function, the CAPS2 formula or the game-rating formula. We never present any [OURS] formula as Chess.com's.

Primary sources (read 2026-11-10):

| Ref | Source | What it gives |
|---|---|---|
| S1 | Chess.com Help, "How are moves classified? What is a blunder or brilliant…" — https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-and-etc | Expected Points Model description, threshold table, qualitative Great / Brilliant / Miss definitions; rating-dependence. |
| S2 | Chess.com Help, "How is accuracy in analysis determined?" — https://support.chess.com/en/articles/8708970-how-is-accuracy-in-analysis-determined | CAPS2 is the accuracy system; most scores fall between 50 and 95; no formula. |
| S3 | Chess.com Help, "How is Game Rating calculated in Game Review?" — https://support.chess.com/en/articles/10773754-how-is-game-rating-calculated-in-game-review | Game rating compares move quality to what is expected at the player's rating; no formula. |
| S4 | Lichess, "Accuracy" — https://lichess.org/page/accuracy | Win% curve from centipawns; per-move accuracy curve; aggregation. |
| S5 | Lichess source, `AccuracyPercent.scala` and `WinPercent` in https://github.com/lichess-org/lila | Exact constants for S4 (curve fit), windowing and weighting. AGPL-3.0: read for constants only, not copied. |
| S6 | Stockfish.js README (npm `stockfish` 19.0.1) | Engine flavours, sizes, browser/Node usage. |
| S7 | UCI protocol — https://backscattering.de/chess/uci/ | `info`/`bestmove` grammar, score bounds, `stop` semantics. |

## 1. Stockfish integration

- Engine: Stockfish 19 via Stockfish.js 19.0.1, **lite single-threaded** build (smaller NNUE net, no cross-origin isolation). [S6]
- The same build runs in the browser (Web Worker) and in Node (tests, benchmark CLI), so benchmark numbers match what users see.
- Engine strength matters for benchmarking: Chess.com uses its own engine setup. Differences from that are recorded as **engine disagreement**, not classification disagreement (see `BENCHMARKING.md`).

## 2. UCI workflow

```
→ uci                                ← id name Stockfish 19 …  ← uciok
→ setoption name Hash value 32
→ setoption name UCI_ShowWDL value true
→ isready                            ← readyok
→ ucinewgame ; isready               ← readyok          (once per game)
per position:
→ setoption name MultiPV value 2     (only when it changes)
→ position fen <startFen> moves <m1 … mk>
→ go depth 14
← info depth … multipv 1 score cp 23 wdl 60 900 40 … pv e2e4 e7e5 …
← info depth … multipv 2 score cp 11 …
← bestmove e2e4 ponder e7e5
```

- The result for a position is the deepest complete `info` line for each `multipv` index at or before `bestmove`. Lines with `lowerbound`/`upperbound` are only used if no exact line exists at that depth. [S7]
- `bestmove (none)` (no legal moves) does not normally reach the engine, because terminal positions are handled by rules (§12).

## 3. Position evaluation

Per position we keep: score, optional WDL, best move, principal variation and depth for each MultiPV line (see `PositionAnalysis` in `TECHNICAL_ARCHITECTURE.md` §9).

- **Score perspective.** UCI scores are from the side to move. We convert to **White's perspective** immediately after parsing, so everything stored is White POV. The conversion is the only place where side-to-move sign handling happens (`toWhitePov` in `evaluation.ts`). Verified by test: after `1.e4 e5 2.Nf3` (Black to move) the engine reports a negative cp; stored White-POV value is positive.
- **WDL** (`UCI_ShowWDL`) is stored White POV as `[win, draw, loss]` per mille. It is recorded for research (Phase 4). It is not used by the MVP formulas, because Stockfish's WDL model is calibrated to engine play, not human play. [OURS]

## 4. Centipawn and mate-score handling

- `Score = { type: "cp", value } | { type: "mate", value }`, White POV.
- Mate `+n`: White mates in *n* moves. Mate `−n`: Black mates in *n*. Mate `0` only appears for a position where the side to move is already checkmated; it is produced by rules and carries an explicit `winner` field (`{ type: "mate", value: 0, winner: "w" }`), because 0 has no sign. Use `mateWinner(score)` instead of reading the sign.
- Ordering (for comparisons and sorting): any mate-for-White > any cp > any mate-for-Black; a shorter mate is better for the mating side.
- Display: cp as pawns with one decimal (`+0.4`), mate as `M3` / `−M3`.

## 5. Evaluation normalisation and expected points

We need a mapping from a White-POV score to expected points (EP) in [0, 1] for each side. Chess.com says its Expected Points Model uses the engine evaluation **and the player's rating** [CC-PUBLIC, S1], but does not publish the function.

**MVP model [LICHESS-PUBLIC curve, used by us as an approximation]:**

```
cpClamped = clamp(cp, −1000, 1000)
EP_white(cp) = 1 / (1 + exp(−0.00368208 · cpClamped))
EP_white(mate for White) = 1
EP_white(mate for Black) = 0
EP_black = 1 − EP_white
```

The constant `0.00368208` is Lichess's fitted logistic coefficient [S4, S5]; Win% = 100 · EP. This model is **rating-independent**. [OURS] assumption: it is a reasonable first approximation. Phase 4 will test a rating-dependent coefficient `k(rating)` fitted to benchmark data, and Stockfish WDL as an alternative. All are behind `ExpectedPointsModel` in config.

## 6. Move classification

### 6.1 Inputs per move (ply *i*, mover *c*)

- `before` = analysis of position *i−1* (mover to play), `after` = analysis of position *i*.
- `EP_before` = EP for *c* of `before.evaluation` (best play from the position before).
- `EP_after` = EP for *c* of `after.evaluation`.
- `EP_loss = max(0, EP_before − EP_after)`.
- `isEngineBest` = played UCI equals `before.bestMove`, or equals another MultiPV line whose score equals line 1's score.

`EP_loss` is clamped at 0 because the engine can rate the position after the best move slightly higher than before (search noise). If `isEngineBest`, `EP_loss` is set to 0, so a best move is never penalised for search noise. [OURS]

### 6.2 Base classification [CC-PUBLIC thresholds, S1]

| Classification | EP lost (as published) | Our boundary rule [OURS] |
|---|---|---|
| Best | 0.00 | `isEngineBest` (EP_loss = 0) |
| Excellent | 0.00 – 0.02 | 0 < loss ≤ 0.02 |
| Good | 0.02 – 0.05 | 0.02 < loss ≤ 0.05 |
| Inaccuracy | 0.05 – 0.10 | 0.05 < loss ≤ 0.10 |
| Mistake | 0.10 – 0.20 | 0.10 < loss ≤ 0.20 |
| Blunder | 0.20 – 1.00 | loss > 0.20 |

The published table does not say which side of each boundary is inclusive; we use "upper bound inclusive". Chess.com's EP values come from their own rating-aware model, so the same thresholds applied to our EP model will not give identical labels.

### 6.3 Special classifications

These override the base label in this order: **Brilliant → Great → Miss**. Each rule is a pure function in `moveClassification.ts`, with its parameters in config.

#### Great [CC-PUBLIC description; rule is OURS]

S1 describes a Great move as critical to the outcome: turning losing into equal, equal into winning, or finding the only good move. It also says thresholds are more generous for newer players.

Our rule (v1):

1. The move is `isEngineBest`.
2. The position was **critical**: MultiPV line 2 exists and `EP(line1) − EP(line2) ≥ greatOnlyMoveGap` (default 0.15) for the mover. In other words, the second-best move would have been at least a Mistake.
3. Not trivial: the position had more than one legal move, and the move is not a plain recapture (capturing on the square where the opponent just captured, with a piece value equal to or lower than the opponent's capture).
4. Not already decided: line 2 still leaves the mover below `greatMaxSecondEP` (default 0.90). If even the second-best move is completely winning, the best move is not "critical".

Rating-dependent generosity is not modelled in v1.

#### Brilliant [CC-PUBLIC description; rule is OURS]

S1: the move must be best or nearly best and involve a good piece sacrifice; the player must not be in a bad position after it, and must not already be completely winning without it. The sacrifice definition is more generous for newer players.

Our rule (v1):

1. `EP_loss ≤ brilliantMaxLoss` (default 0.02, i.e. Best or Excellent).
2. **Piece sacrifice** (see §7): the move leaves material of value ≥ `sacrificeMinValue` (default 2 pawns, which includes the exchange) capturable, measured either statically or along the engine's PV. Pawn-only sacrifices do not count.
3. **Not bad after:** `EP_after ≥ brilliantMinEPAfter` (default 0.45).
4. **Not already completely winning:** the mover's EP with the best alternative that is not a sacrifice (MultiPV line 2 when line 1 is the sacrifice; otherwise `EP_before`) is `< brilliantMaxEPWithout` (default 0.95).

A move is **not** Brilliant just because it matches the engine's second line or because it is a capture.

#### Miss [CC-PUBLIC description; rule is OURS]

S1: a Miss is failing to take advantage of the opponent's mistake. Our rule (v1):

1. The opponent's previous move was a Mistake, Blunder or Miss, **or** raised the mover's EP by at least `missOpportunityGain` (default 0.10) compared with the position before it.
2. This move has `EP_loss ≥ missMinLoss` (default 0.10). Smaller losses keep their base label.
3. The mover gave back most of the opportunity: `EP_after ≤ EP_beforeOpponentMove + missGiveBackMargin` (default 0.05), where `EP_beforeOpponentMove` is the mover's EP before the opponent's error.

When all three hold, the base label (Mistake / Blunder) is replaced by Miss. A missed forced mate where the mover stays completely winning (`EP_after ≥ 0.95`) is **not** a Miss in v1; it keeps its base label.

## 7. Sacrifice detection [OURS]

Piece values: P=1, N=3, B=3, R=5, Q=9, K=0.

A move by side *c* is a **sacrifice** if either:

- **Accepted along the PV.** Starting at the position after the move, follow `after.lines[0].pv` for up to `sacrificePvPlies` (default 6) plies. Track *c*'s material balance relative to the position before the move. If the minimum balance reaches `−sacrificeMinValue` or lower, and the material lost includes a non-pawn piece of *c*, it is a sacrifice. Material recovered later in the line does not cancel it (a sound sacrifice usually wins material back or mates).
- **Offered statically.** After the move, the moved piece (non-pawn) stands on a square attacked by the opponent, and either the square is undefended, or it is attacked by a lower-value piece. This catches sacrifices the engine shows as declined.

Exclusions: captures where *c* takes material at least equal to what it can lose (for example, `QxQ` that can be recaptured); promotions that are simple trades; moves out of check with only that piece able to block are still allowed.

This is an approximation that will be tuned in Phase 4. It is deliberately conservative: false Brilliants hurt credibility more than missed ones.

## 8. Accuracy [LICHESS-PUBLIC method; CAPS2 not reproduced]

Chess.com uses CAPS2 [S2], whose formula is not public. S2 only tells us that most scores fall between 50 and 95. We implement the Lichess-published accuracy method [S4, S5] and benchmark it against Chess.com in Phase 4.

Per move, with Win% = 100 · EP from the mover's perspective:

```
if winAfter ≥ winBefore: moveAcc = 100
else:
  d = winBefore − winAfter
  moveAcc = 103.1668100711649 · exp(−0.04354415386753951 · d) − 3.166924740191411
  moveAcc = clamp(moveAcc + 1, 0, 100)      # +1 "uncertainty bonus", as published
```

Per player:

1. Build the White-POV Win% series over all positions (start position included).
2. `windowSize = clamp(floor((nPositions − 1) / 10), 2, 8)` (computed from the number of moves).
3. Volatility weights: for each move, the standard deviation of Win% in its sliding window, clamped to [0.5, 12]. The first moves use the first window.
4. `weighted = Σ(w·acc) / Σw` and `harmonic = n / Σ(1/acc)` over the player's moves (`acc` floored at a small epsilon to avoid division by zero).
5. `accuracy = (weighted + harmonic) / 2`, bounded to [0, 100].

Notes:

- This is not "percentage of engine-best moves".
- Limitations: (a) not CAPS2, so absolute values will differ (Lichess numbers are usually lower than Chess.com's); (b) it depends on engine depth; (c) one move in a lost position costs little, by design.
- If Phase 4 shows a stable monotonic relationship, a documented calibration curve (our accuracy → Chess.com-like scale) may be added as a separate, versioned step. It must be fitted from benchmark data, never guessed.

## 9. Game performance rating [OURS, provisional]

Chess.com says its game rating compares move quality to what is expected at the player's rating, and it uses the player's rating as an input [S3]. The formula is not public.

**v0 (Phase 2, uncalibrated):** `rating = interpolate(accuracy, calibrationTable)`, a monotonic piecewise-linear table from game accuracy to rating, clamped to [100, 3200].

- The seed table will be explicitly marked `calibrated: false`, and the UI will show the value as "Estimated game rating (experimental)".
- Phase 4 replaces the seed with a table fitted on benchmark games (Chess.com game ratings as the target), and tests whether adding the PGN rating headers (`WhiteElo`/`BlackElo`) as an input reduces error. This is how S3 describes Chess.com working.
- The value is never called Elo, FIDE or a Chess.com rating.

## 10. Game-phase classification [OURS, inspired by the Lichess "Divider" idea]

Counted on each position: `majorsMinors` = number of N, B, R, Q on the board (both sides).

- **Opening** until the first position where `majorsMinors ≤ 10`, or either side has fewer than 4 pieces left on its back rank, or ply > `openingMaxPly` (default 30).
- **Endgame** from the first position where `majorsMinors ≤ 6`.
- **Middlegame** in between. Phases never go backwards.

A move belongs to the phase of the position **before** it. Phase breakdowns reuse the accuracy and count functions on each subset of moves.

## 11. Critical-position analysis [OURS]

A position is **critical** for the side to move when `EP(line1) − EP(line2) ≥ criticalGap` (default 0.15), i.e. only one move keeps the evaluation. Critical positions drive the Great rule, explanation text ("This was the only move that…") and graph markers. This needs MultiPV ≥ 2; with MultiPV 1, Great is never assigned and the review records that.

## 12. Edge cases

| Case | Handling |
|---|---|
| Position is checkmate | Rules: mate 0 for the winner (EP 1 / 0). No engine call. |
| Stalemate, insufficient material | Rules: cp 0 (draw). No engine call. |
| Threefold repetition, fifty-move rule | Left to the engine, which receives the move history and scores such positions as draws. (In over-the-board PGNs these are draws only when claimed, so they are not treated as terminal by rules.) |
| Move that delivers mate | `after` is checkmate → EP_after = 1 → Best (if it was the engine's best) or loss 0. |
| Only one legal move | Classified normally but never Great or Brilliant. |
| Game with 0 moves | Not analysed (error shown). |
| Game with custom FEN start | Supported; the first mover may be Black. |
| Resignation / time loss in a better position | Result header is shown; the evaluation is not changed. |
| Engine reports mate then cp at a deeper depth | We use the deepest exact line. |
| Repeated position in a game | Engine sees move history (`position … moves …`), so repetition draws are visible. The session cache ignores history, so a repeated FEN reuses the first result. This is a known approximation. |
| Mover already mated or winning by mate both before and after | EP 1 → 1, loss 0. |
| Mate-in-N became cp but still winning (e.g. M5 → +12) | Both clamp near EP 1, so small loss; not a Miss (§6.3). |
| Promotion moves | UCI includes the piece (`e7e8q`); compared exactly. |

## 13. Configurable thresholds

All parameters live in `src/lib/analysis/config.ts` as one object with a version string, for example:

```ts
export const CLASSIFICATION_CONFIG = {
  version: "cls-v1",
  expectedPoints: { model: "logistic", k: 0.00368208, cpClamp: 1000 },
  thresholds: { excellent: 0.02, good: 0.05, inaccuracy: 0.10, mistake: 0.20 },
  great: { onlyMoveGap: 0.15, maxSecondEP: 0.90 },
  brilliant: { maxLoss: 0.02, minEPAfter: 0.45, maxEPWithout: 0.95, sacrificeMinValue: 2, sacrificePvPlies: 6 },
  miss: { opportunityGain: 0.10, minLoss: 0.10, giveBackMargin: 0.05 },
  phases: { openingMaxPly: 30, middlegameMaxPieces: 10, endgameMaxPieces: 6 },
} as const;
```

Changing any value requires bumping `version`, adding an entry to `DECISIONS.md`, and re-running the benchmark.

## 14. Testing strategy

- **Unit tests (pure, no engine):** UCI parsing; POV conversion; score ordering; EP function (symmetry `EP_w(x) + EP_w(−x) = 1`, monotonic, mate edges); classification boundaries (each threshold ±ε); Great/Brilliant/Miss on hand-built `PositionAnalysis` fixtures; accuracy bounds and monotonicity; phase detection on known FENs; count reconciliation.
- **Integration tests (real engine in Node, same WASM build):** PGN → `GameAnalysis` for short games; checks position count, POV consistency, legal best moves, terminal handling, cache hits.
- **Golden tests (Phase 4):** frozen engine output for benchmark games, so classification changes can be tested without re-running the engine.
- **Property tests (later):** accuracy ∈ [0, 100]; counts sum to moves.
