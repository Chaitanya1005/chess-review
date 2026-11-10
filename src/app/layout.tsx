import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chess Review — free, open-source game review",
  description: "Free, open-source chess game review that runs Stockfish in your browser.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const SOURCE_URL = "https://github.com/Chaitanya1005/chess-review";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line bg-surface">
          <nav className="mx-auto flex h-12 w-full max-w-6xl items-center gap-4 px-4">
            <Link href="/" className="font-semibold">
              Chess Review
            </Link>
            <Link href="/" className="ml-auto text-sm text-muted hover:text-foreground">
              New review
            </Link>
          </nav>
        </header>
        {children}
        <footer className="mt-auto border-t border-line px-4 py-5 text-xs text-muted">
          <div className="mx-auto max-w-6xl space-y-1">
            <p>
              Free software under the GPL-3.0-or-later licence.{" "}
              <a className="underline" href={SOURCE_URL}>
                Source code
              </a>
              . Analysis by{" "}
              <a className="underline" href="https://stockfishchess.org">
                Stockfish
              </a>{" "}
              (GPL-3.0) via{" "}
              <a className="underline" href="https://github.com/nmrugg/stockfish.js/tree/v19.0.1">
                Stockfish.js 19.0.1
              </a>
              . Board by{" "}
              <a className="underline" href="https://github.com/lichess-org/chessground">
                Chessground
              </a>{" "}
              (GPL-3.0-or-later).
            </p>
            <p>Not affiliated with Chess.com or Lichess.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
