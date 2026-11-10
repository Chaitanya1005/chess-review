import type { Metadata } from "next";
import { EngineDevPanel } from "./EngineDevPanel";

export const metadata: Metadata = { title: "Engine pipeline (dev)", robots: { index: false } };

export default function EngineDevPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">Engine pipeline (Phase 1 developer page)</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Raw Stockfish analysis per position, White&apos;s perspective. The engine runs in a Web Worker in this tab.
      </p>
      <EngineDevPanel />
    </main>
  );
}
