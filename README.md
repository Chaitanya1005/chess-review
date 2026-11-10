# Chess Review

A free, open-source chess game review that runs entirely in your browser.

Paste a PGN, and Stockfish analyses every position on your own device. You get move classifications (Brilliant, Great, Best, Excellent, Good, Inaccuracy, Mistake, Miss, Blunder), an accuracy score for each player, an estimated game rating, an evaluation graph and explanations. There is no account, no server and no paywall.

> **Status:** early development. Phase 1 (engine pipeline) is in place; the full review UI is not built yet. See [docs/DEVELOPMENT_STATUS.md](docs/DEVELOPMENT_STATUS.md).

## How it compares to Chess.com

The review format is inspired by Chess.com's Game Review. Chess.com's scoring methods are proprietary, so this project uses its own documented approximations. These are built from Chess.com's public help articles and Lichess's published accuracy method, and benchmarked against real Chess.com reviews. We publish how close we get; we do not claim identical results. See [docs/ANALYSIS_ENGINE.md](docs/ANALYSIS_ENGINE.md) and [docs/BENCHMARKING.md](docs/BENCHMARKING.md).

This project is not affiliated with Chess.com or Lichess.

## Privacy

Your games never leave your browser. The site is static files only: no backend, no database, no analytics.

## Development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Phase 1 has a developer page at `/dev/engine` that shows raw engine analysis for a PGN.

```bash
npm test
```

Tests include integration tests that run the real Stockfish WASM engine in Node.

## Documentation

- [Project brief](docs/PROJECT_BRIEF.md)
- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Technical architecture](docs/TECHNICAL_ARCHITECTURE.md)
- [Analysis engine](docs/ANALYSIS_ENGINE.md)
- [Benchmarking](docs/BENCHMARKING.md)
- [Decisions](docs/DECISIONS.md)
- [Development status](docs/DEVELOPMENT_STATUS.md)

## Licence

GPL-3.0-or-later. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The analysis engine is [Stockfish](https://github.com/official-stockfish/Stockfish) (GPL-3.0), distributed as [Stockfish.js](https://github.com/nmrugg/stockfish.js) v19.0.1 by Nathan Rugg and Chess.com, LLC, unmodified.
