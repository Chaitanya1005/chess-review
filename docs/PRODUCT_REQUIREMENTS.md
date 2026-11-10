# Product Requirements

Requirement IDs (`FR-*`, `NFR-*`) are referenced from code, tests and `DEVELOPMENT_STATUS.md`.

## 1. Functional requirements

### 1.1 PGN import (FR-PGN)

| ID | Requirement |
|---|---|
| FR-PGN-1 | The user can paste PGN text into a text area. |
| FR-PGN-2 | The user can upload a `.pgn` file (read in the browser with `FileReader`; nothing is uploaded to a server). |
| FR-PGN-3 | The input is validated before analysis starts. Empty input, illegal moves, and unsupported variants are rejected with a specific message. |
| FR-PGN-4 | Standard SAN, comments `{}`, NAGs (`$1`), variations `()` and move-number styles are accepted. Variations and comments are ignored for analysis (the mainline is used). |
| FR-PGN-5 | Tag pairs (Event, Site, Date, White, Black, Result, WhiteElo, BlackElo, TimeControl, ECO, Opening, Termination, FEN/SetUp) are preserved and exposed. |
| FR-PGN-6 | Games with a custom starting position (`[SetUp "1"] [FEN "..."]`) are supported if the FEN is legal standard chess. |
| FR-PGN-7 | Games of any length, including zero moves, are handled. A game with zero moves shows a clear message and is not analysed. |
| FR-PGN-8 | Move order, side to move and the game result are preserved exactly. |
| FR-PGN-9 | If the input contains several games, the first game is used and the user is told so. (Choosing among several games may come later.) |
| FR-PGN-10 | Error messages name the problem and, for illegal moves, the move number and SAN that failed. |

### 1.2 Interactive chessboard (FR-BOARD)

| ID | Requirement |
|---|---|
| FR-BOARD-1 | Show the position at the selected ply, including the starting position. |
| FR-BOARD-2 | Navigate first / previous / next / last with buttons and the keyboard (arrow keys, Home/End). |
| FR-BOARD-3 | Clicking a move in the move list jumps to that position. |
| FR-BOARD-4 | Highlight the last move played and the selected move in the list. |
| FR-BOARD-5 | Show an arrow for the engine's best move from the previous position when the played move was not best. |
| FR-BOARD-6 | Flip the board. The default orientation is White, or the side named in the URL/selection later. |
| FR-BOARD-7 | Show captured pieces and the material difference for each side. |
| FR-BOARD-8 | Swipe or tap controls are usable on touch screens. |
| FR-BOARD-9 | Show the classification icon on the destination square of the selected move. |

### 1.3 Engine analysis (FR-ENG)

| ID | Requirement |
|---|---|
| FR-ENG-1 | Stockfish runs in the browser as WebAssembly inside a Web Worker. |
| FR-ENG-2 | Every position in the mainline (from the start position to the final position) gets an evaluation. |
| FR-ENG-3 | Each analysis records: evaluation (centipawns or mate, normalised to White's perspective), best move, principal variation, search depth, and optionally WDL and MultiPV alternatives. |
| FR-ENG-4 | Terminal positions (checkmate, stalemate, insufficient material) are evaluated by rules, not by the engine. |
| FR-ENG-5 | Repeated requests for the same position and settings come from a cache within the session. |
| FR-ENG-6 | Depth, MultiPV, hash size and per-position time limits are configurable in code. |
| FR-ENG-7 | Analysis progress (positions done / total) is reported to the UI. |
| FR-ENG-8 | Analysis can be cancelled. Cancelling stops the engine search promptly. |
| FR-ENG-9 | Engine load failures, crashes and timeouts produce a clear error and do not freeze the page. |
| FR-ENG-10 | The analysis algorithm depends on an engine interface, not on Stockfish.js directly. |

### 1.4 Move classification (FR-CLS)

| ID | Requirement |
|---|---|
| FR-CLS-1 | Every move by both players gets exactly one classification: Brilliant, Great, Best, Excellent, Good, Inaccuracy, Mistake, Miss or Blunder. Book moves may be labelled "Book" later; this is not in the MVP. |
| FR-CLS-2 | Base classifications come from expected points lost from the mover's perspective. |
| FR-CLS-3 | Great, Brilliant and Miss use extra rules (critical/only move, sound sacrifice, failure to punish), described in `ANALYSIS_ENGINE.md`. |
| FR-CLS-4 | Thresholds are configuration, with a version string attached to every review. |
| FR-CLS-5 | Classification is deterministic: the same analysis input gives the same output. |
| FR-CLS-6 | Classification code is pure functions, unit-testable without an engine. |

### 1.5 Accuracy (FR-ACC)

| ID | Requirement |
|---|---|
| FR-ACC-1 | Each player gets an accuracy between 0 and 100 (inclusive), shown with one decimal place. |
| FR-ACC-2 | Accuracy is derived from expected-point (win-probability) losses per move, not from the share of engine-matching moves. |
| FR-ACC-3 | The method and its limitations are documented. |
| FR-ACC-4 | A player with no moves (for example, a game with one ply) shows "—" instead of a number. |

### 1.6 Game performance rating (FR-RAT)

| ID | Requirement |
|---|---|
| FR-RAT-1 | Each player gets an estimated performance rating for this game. |
| FR-RAT-2 | It is labelled "Estimated game rating". It is never called an Elo, FIDE or Chess.com rating. |
| FR-RAT-3 | The method is deterministic, documented and unit-tested. |
| FR-RAT-4 | The estimate is clamped to a documented range (100–3200). |

### 1.7 Evaluation graph (FR-GRAPH)

| ID | Requirement |
|---|---|
| FR-GRAPH-1 | Plot the evaluation after every ply from White's perspective, with White advantage above and Black advantage below the midline. |
| FR-GRAPH-2 | Large values are compressed (win-probability scale) so the graph stays readable. Mate is shown at the edge. |
| FR-GRAPH-3 | Mark mistakes, misses and blunders (and brilliant/great moves) on the graph. |
| FR-GRAPH-4 | Clicking or tapping the graph selects that ply. The selected ply is highlighted. |

### 1.8 Game statistics (FR-STAT)

| ID | Requirement |
|---|---|
| FR-STAT-1 | Per player: accuracy, estimated game rating, and counts for each classification. |
| FR-STAT-2 | Per player, per phase (opening / middlegame / endgame): accuracy and classification counts, when the phase has moves. |
| FR-STAT-3 | Counts reconcile exactly: per player, the sum of classification counts equals the number of moves the player made. |

### 1.9 Move explanation (FR-EXP)

| ID | Requirement |
|---|---|
| FR-EXP-1 | For the selected move: the move played, its classification, the engine's best move, and the evaluation before and after. |
| FR-EXP-2 | A deterministic sentence explaining why (for example "This loses a knight", "This allows mate in 3", "You missed winning the queen with Nxd5"). |
| FR-EXP-3 | Show the engine continuation (PV) for the best move and, when useful, for the move played. |
| FR-EXP-4 | No LLM or paid API is used. |

## 2. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | No mandatory backend. The site is a static export served from a CDN. |
| NFR-2 | The main thread is never blocked by engine search. Input and navigation stay responsive during analysis. |
| NFR-3 | The engine is lazy-loaded only when analysis starts. The homepage does not download the engine. |
| NFR-4 | A 40-move game at default settings finishes in about a minute on a recent mid-range laptop. This is a target, not a promise; mobile devices will be slower and that is acceptable. |
| NFR-5 | The page works in current Chrome, Edge, Firefox and Safari, desktop and mobile (iOS 16+, Android with a recent Chrome). |
| NFR-6 | No PGN data is sent to any server. There are no third-party analytics in the MVP. |
| NFR-7 | The codebase is TypeScript strict, linted, and has unit tests for all analysis calculations. |
| NFR-8 | GPL obligations for Stockfish and other GPL dependencies are met (see `TECHNICAL_ARCHITECTURE.md`, §Licensing). |
| NFR-9 | WCAG 2.1 AA as far as is practical: keyboard navigation, sufficient contrast, labels on controls, classification shown with text and not just colour. |
| NFR-10 | Reviews are reproducible: each review records the engine build, depth, MultiPV and classification version. |

## 3. Mobile requirements

- MOB-1: Below 768 px width, the layout stacks: player bars and board first, then navigation controls, then the selected-move panel, then tabs for Moves / Stats / Graph.
- MOB-2: Navigation buttons are at least 44×44 px.
- MOB-3: The board fits the viewport width with a 16 px gutter.
- MOB-4: Analysis keeps working if the tab stays in the foreground. If the browser suspends the tab, the user is told that analysis paused and it resumes or can be restarted.
- MOB-5: Default analysis settings for low-end devices may be lighter (lower depth). The settings used are shown in the review.

## 4. Error handling

| Situation | Behaviour |
|---|---|
| Empty input | "Paste a PGN or choose a file." |
| Unparseable PGN / illegal move | Message naming the move number and SAN; nothing is analysed. |
| Unsupported variant tag | "Only standard chess is supported for now." |
| File too large (> 1 MB) or not text | Rejected with a message. |
| Engine fails to load (network, WASM unsupported) | "The analysis engine could not be loaded" plus a retry button. |
| Engine crash or timeout during a review | The current review stops with an error. Results so far are discarded; the user can retry. The worker is recreated. |
| User navigates away / cancels | The search stops and the worker is terminated. |

## 5. Acceptance criteria (product level)

1. A valid PGN pasted or uploaded produces a full review with no backend calls (checked in the network panel: only static assets).
2. Every mainline move appears in the move list with exactly one classification.
3. The board, move list, graph and explanation panel always show the same ply.
4. The statistics panel counts equal the classifications in the move list.
5. Accuracy is within [0, 100] for every player in every benchmark game.
6. The UI stays responsive during analysis (no long tasks > 200 ms caused by analysis on the main thread).
7. Layouts are usable at 375 px, 768 px and 1280 px widths.
8. Invalid PGNs give specific errors and never crash the page.
