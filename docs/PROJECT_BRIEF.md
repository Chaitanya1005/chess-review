# Project Brief — Open-Source Chess Game Review

## Product vision

A free, open-source, mobile-friendly website where anyone can paste a chess game and get a complete game review: move classifications, accuracy, an estimated performance rating, an evaluation graph and plain-language explanations. All of it runs in the user's own browser.

## Problem statement

The best-known game review experience, Chess.com's Game Review, is mostly a premium feature. Free alternatives exist (for example Lichess analysis), but they use a different presentation and vocabulary (no Brilliant/Great/Miss labels, no game rating). Many players who learned on Chess.com want that familiar review format for any game, from any site, without paying or signing up.

## Target users

- Club and online players (roughly 400–2200) reviewing their own games.
- Coaches and streamers who want to show a review of a game quickly.
- Players on other platforms who want a Chess.com-style review of a PGN.
- Developers who want an open, auditable analysis pipeline.

## Core value proposition

- **Free and private:** no account, no server-side analysis. The game never leaves the browser.
- **Familiar:** a review format and classification vocabulary that matches what Chess.com users expect.
- **Transparent:** the classification, accuracy and rating methods are documented, versioned and benchmarked against Chess.com in public. We never claim exact parity.

## Main user journey

1. Open the website.
2. Paste a PGN or upload a `.pgn` file.
3. Press **Review game**.
4. Watch the analysis progress (Stockfish runs locally in a Web Worker).
5. Browse the review: board, move list with classifications, accuracy, game rating, evaluation graph and explanations.

## Product objectives (in priority order)

1. Reliable chess analysis.
2. Results as close to Chess.com Game Review as can be shown with evidence.
3. An intuitive, familiar review interface.
4. Free and accessible analysis.
5. Operating costs close to zero (static hosting only).
6. Open source.
7. Usable on desktop, tablet and mobile.

## MVP scope

- PGN paste and upload, validation and clear errors (standard chess only).
- In-browser Stockfish analysis (WASM, Web Worker, UCI).
- Move classification: Brilliant, Great, Best, Excellent, Good, Inaccuracy, Mistake, Miss, Blunder.
- Accuracy per player (0–100).
- Estimated game performance rating per player (labelled as an estimate).
- Interactive board, move list, evaluation graph and statistics panels.
- Deterministic, template-based move explanations.
- Opening / middlegame / endgame breakdowns.
- Responsive layout for mobile.
- A benchmarking harness and a public report comparing against Chess.com.

## Non-goals (MVP)

- Accounts, login, saved game history or any database.
- Server-side analysis or paid APIs, including LLM explanations.
- Chess variants (Chess960 may come later; it is not in the MVP).
- Importing games directly from Chess.com/Lichess APIs.
- Playing games or puzzles.
- Opening-book naming beyond what the PGN provides (an opening database could come later).
- Any claim of reproducing Chess.com's proprietary algorithms.

## Long-term opportunities

- Import by username or URL from the public Lichess/Chess.com APIs.
- Opening explorer and ECO naming.
- Optional stronger engine (full NNUE, multi-threaded) for capable devices.
- Shareable review links (encoded PGN in the URL, still no backend).
- Self-learning tactics/puzzles from the user's own mistakes.
- Optional LLM explanations running locally, or with the user's own key.
- Chess960 and other variants.
- Translations.
