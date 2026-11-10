import Link from "next/link";

// Placeholder homepage. The real homepage (PGN input, upload, Review game) is Phase 3.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Chess Review</h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">
        A free, open-source chess game review that runs Stockfish in your browser. Under construction.
      </p>
      <p className="mt-6">
        <Link className="underline" href="/dev/engine">
          Engine pipeline developer page
        </Link>
      </p>
    </main>
  );
}
