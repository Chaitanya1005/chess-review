# CLAUDE.md

Instructions for Claude Code sessions working on this repository.

## Read before you work

1. Before major work: read `docs/PROJECT_BRIEF.md`.
2. Before changing system design: read `docs/TECHNICAL_ARCHITECTURE.md`.
3. Before changing any chess calculation (evaluation, expected points, classification, accuracy, rating, phases): read `docs/ANALYSIS_ENGINE.md`.
4. Before any architectural change: read `docs/DECISIONS.md`.
5. Before continuing implementation: read `docs/DEVELOPMENT_STATUS.md`.

## Rules

6. Preserve the decisions in `docs/DECISIONS.md` unless there is a strong technical reason. To change one, add a new entry that supersedes it; never silently edit or delete old entries.
7. When implementation changes, update the matching documentation in the same change (`DEVELOPMENT_STATUS.md` always).
8. Write tests for chess-analysis logic. Pure calculations go in `src/lib/analysis/` with unit tests in `tests/`.
9. Avoid unnecessary dependencies. Justify any new runtime dependency in `DECISIONS.md`.
10. Never fabricate test results, benchmark numbers or engine output. Do not say something is complete without running it.
11. Prefer small, testable modules. `src/lib/` must not import React or touch the DOM (except `src/lib/engine/browserTransport.ts`).
12. Stay browser-first and backend-free unless a documented requirement changes this.
13. Never use Chess.com's proprietary assets, and never claim to reproduce their proprietary algorithms exactly. Label each method as Chess.com-public, Lichess-public or ours, as `ANALYSIS_ENGINE.md` does.

## Conventions

- Evaluations are stored **White POV**. Convert UCI (side-to-move POV) only in `toWhitePov` (`src/lib/analysis/evaluation.ts`).
- Classification thresholds live in `src/lib/analysis/config.ts`. Changing one means bumping its `version` and adding a decision entry.
- Licence is GPL-3.0-or-later. Do not copy AGPL code from Lichess; implement from published descriptions and cite them.

## Commands

```bash
npm install          # also copies the engine into public/engine/
npm run dev          # http://localhost:3000 (Phase 1 dev page: /dev/engine)
npm test             # unit + real-engine integration tests (Vitest)
npm run typecheck
npm run lint
npm run build        # static export to out/
npm run analyze -- game.pgn --depth 16   # full review in Node (same engine); --out file.json freezes it
```
