# Third-Party Notices

This project is licensed under GPL-3.0-or-later (see `LICENSE`). It includes or depends on the following third-party software.

## Distributed with the website

### Stockfish 19 / Stockfish.js 19.0.1 — GPL-3.0

- Files: `public/engine/stockfish-19-lite-single.js`, `public/engine/stockfish-19-lite-single.wasm` (copied unmodified from the npm package `stockfish@19.0.1` by `scripts/copy-engine.mjs`; licence text shipped as `public/engine/COPYING.txt`).
- Stockfish: © the Stockfish developers (see the AUTHORS file in the Stockfish repository). Source: https://github.com/official-stockfish/Stockfish
- Stockfish.js: © Nathan Rugg and Chess.com, LLC. Corresponding source for this exact build: https://github.com/nmrugg/stockfish.js/tree/v19.0.1 (release: https://github.com/nmrugg/stockfish.js/releases/tag/v19.0.1).
- The "lite" NNUE network is credited in the Stockfish.js README.

### chess.js 1.4.0 — BSD-2-Clause

© Jeff Hlywa. https://github.com/jhlywa/chess.js

### Chessground 10.5.0 — GPL-3.0-or-later

© the lichess.org developers. https://github.com/lichess-org/chessground (npm `@lichess-org/chessground@10.5.0`). Bundled into the site's JavaScript and CSS (`chessground.base.css`, `chessground.brown.css`).

### cburnett chess pieces — GPL-2.0-or-later

© Colin M.L. Burnett. The piece SVGs embedded in Chessground's `chessground.cburnett.css`. Licence as listed in Lichess's COPYING.md (https://github.com/lichess-org/lila/blob/master/COPYING.md), checked 2026-11-11. GPL-2.0-or-later is compatible with this project's GPL-3.0-or-later.

### Next.js, React, React DOM — MIT

© Vercel, Inc. and Meta Platforms, Inc. and affiliates.

## Development only (not distributed)

Vitest, tsx, jsdom, Testing Library (`@testing-library/react`, `@testing-library/dom`), ESLint, TypeScript, Tailwind CSS — MIT. Used for building and testing; not shipped in the site.

## Methods (not code)

- Win-probability curve and accuracy formula follow the method Lichess publishes at https://lichess.org/page/accuracy. No Lichess (AGPL-3.0) code is copied.
- Move-classification thresholds follow Chess.com's public help article. No Chess.com code or assets are used. This project is not affiliated with Chess.com or Lichess.
