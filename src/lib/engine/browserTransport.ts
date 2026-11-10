import type { EngineTransport } from "./types";

/** Default engine location; files are copied there by scripts/copy-engine.mjs. */
export const DEFAULT_ENGINE_URL = "/engine/stockfish-19-lite-single.js";

/**
 * Runs Stockfish.js as a dedicated Web Worker. The Stockfish.js file is itself a worker
 * script that speaks UCI over postMessage, so no wrapper worker is needed.
 */
export function createBrowserTransport(url: string = DEFAULT_ENGINE_URL): EngineTransport {
  if (typeof Worker === "undefined") throw new Error("Web Workers are not supported in this browser");
  if (typeof WebAssembly === "undefined") throw new Error("WebAssembly is not supported in this browser");

  const worker = new Worker(url);
  const lineListeners: ((line: string) => void)[] = [];
  const errorListeners: ((error: Error) => void)[] = [];

  worker.onmessage = (event: MessageEvent) => {
    const data = typeof event.data === "string" ? event.data : String(event.data ?? "");
    for (const line of data.split("\n")) for (const l of lineListeners) l(line);
  };
  worker.onerror = (event: ErrorEvent) => {
    event.preventDefault();
    const error = new Error(event.message || "Engine worker failed to load or crashed");
    for (const l of errorListeners) l(error);
  };

  return {
    send: (command) => worker.postMessage(command),
    onLine: (listener) => void lineListeners.push(listener),
    onError: (listener) => void errorListeners.push(listener),
    terminate: () => worker.terminate(),
  };
}
