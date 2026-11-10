import { createRequire } from "node:module";
import type { EngineTransport } from "./types";

interface StockfishModule {
  processCommand(command: string): void;
  terminate(): void;
}

/**
 * Runs the same Stockfish.js WASM build as the browser, inside Node.
 * Used by tests and the benchmark tooling. Never import this from browser code.
 */
export function createNodeTransport(flavor: string = "lite-single"): EngineTransport {
  const require = createRequire(import.meta.url);
  const lineListeners: ((line: string) => void)[] = [];
  const errorListeners: ((error: Error) => void)[] = [];
  let terminated = false;

  let engine: StockfishModule;
  try {
    const load = require("stockfish") as (flavor: string, onLine: (line: string) => void) => StockfishModule;
    engine = load(flavor, (line: string) => {
      if (terminated) return;
      for (const raw of String(line).split("\n")) for (const l of lineListeners) l(raw);
    });
  } catch (error) {
    throw new Error(`Could not load Stockfish in Node: ${(error as Error).message}`);
  }

  return {
    send: (command) => {
      if (!terminated) engine.processCommand(command);
    },
    onLine: (listener) => void lineListeners.push(listener),
    onError: (listener) => void errorListeners.push(listener),
    terminate: () => {
      if (terminated) return;
      terminated = true;
      engine.terminate();
    },
  };
}
