import { HomeClient } from "@/components/home/HomeClient";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Free chess game review</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Paste a game and Stockfish analyses every move on your own device. You get move labels from Brilliant to Blunder, accuracy
        for both players, an evaluation graph and explanations. No account, no upload, no paywall.
      </p>
      <div className="mt-8">
        <HomeClient />
      </div>
      <p className="mt-8 text-xs text-muted">
        Your game stays in your browser. Accuracy and move labels are our own documented approximations, not Chess.com&apos;s or
        Lichess&apos;s exact results.
      </p>
    </main>
  );
}
