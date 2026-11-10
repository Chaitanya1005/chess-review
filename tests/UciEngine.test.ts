import { describe, expect, it } from "vitest";
import { UciEngine } from "@/lib/engine/UciEngine";
import { EngineError, type EngineTransport } from "@/lib/engine/types";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** A scripted fake engine: `respond` maps each command to the lines the engine replies with. */
function fakeTransport(respond: (command: string) => string[] | undefined) {
  const sent: string[] = [];
  let lineListener: (line: string) => void = () => {};
  let errorListener: (error: Error) => void = () => {};
  let terminated = false;
  const transport: EngineTransport = {
    send(command) {
      sent.push(command);
      const reply = respond(command);
      if (reply) queueMicrotask(() => reply.forEach((l) => lineListener(l)));
    },
    onLine: (l) => void (lineListener = l),
    onError: (l) => void (errorListener = l),
    terminate: () => void (terminated = true),
  };
  return {
    transport,
    sent,
    emit: (line: string) => lineListener(line),
    crash: (message: string) => errorListener(new Error(message)),
    isTerminated: () => terminated,
  };
}

function standardReplies(goReply: string[] | undefined) {
  return (command: string) => {
    if (command === "uci") return ["id name FakeFish 1", "uciok"];
    if (command === "isready") return ["readyok"];
    if (command.startsWith("go")) return goReply;
    return undefined;
  };
}

describe("UciEngine", () => {
  it("performs the UCI handshake once and records the engine name", async () => {
    const fake = fakeTransport(standardReplies(undefined));
    const engine = new UciEngine(fake.transport, { hashMb: 16 });
    await Promise.all([engine.init(), engine.init()]);
    expect(engine.name).toBe("FakeFish 1");
    expect(fake.sent).toEqual([
      "uci",
      "setoption name Hash value 16",
      "setoption name UCI_ShowWDL value true",
      "isready",
    ]);
  });

  it("sends history, sets MultiPV only on change, and keeps the deepest exact line per slot", async () => {
    const fake = fakeTransport(
      standardReplies([
        "info depth 9 multipv 1 score cp 30 pv e2e4 e7e5",
        "info depth 9 multipv 2 score cp 20 pv d2d4",
        "info depth 10 multipv 1 score cp 45 lowerbound pv e2e4",
        "info depth 10 multipv 1 score cp 35 wdl 50 900 50 nodes 999 time 12 pv e2e4 c7c5",
        "info depth 10 multipv 2 score cp 25 pv d2d4 d7d5",
        "info depth 11 multipv 1 score cp 60 upperbound pv g1f3",
        "bestmove e2e4 ponder c7c5",
      ]),
    );
    const engine = new UciEngine(fake.transport);
    const request = { startFen: START, moves: ["e2e4", "e7e5"], depth: 10, multiPv: 2 };
    const result = await engine.analyse(request);

    expect(fake.sent).toContain("setoption name MultiPV value 2");
    expect(fake.sent).toContain(`position fen ${START} moves e2e4 e7e5`);
    expect(fake.sent).toContain("go depth 10");
    expect(result.bestMove).toBe("e2e4");
    expect(result.depth).toBe(10);
    expect(result.nodes).toBe(999);
    expect(result.lines).toEqual([
      { multiPv: 1, depth: 10, score: { type: "cp", value: 35 }, wdl: [50, 900, 50], pv: ["e2e4", "c7c5"] },
      { multiPv: 2, depth: 10, score: { type: "cp", value: 25 }, wdl: undefined, pv: ["d2d4", "d7d5"] },
    ]);

    await engine.analyse(request);
    expect(fake.sent.filter((c) => c.startsWith("setoption name MultiPV"))).toHaveLength(1);
  });

  it("serialises concurrent searches", async () => {
    let n = 0;
    const fake = fakeTransport(standardReplies(undefined));
    const engine = new UciEngine(fake.transport);
    await engine.init();
    const order: string[] = [];
    const a = engine.analyse({ startFen: START, moves: [], depth: 5, multiPv: 1 }).then(() => order.push("a"));
    const b = engine.analyse({ startFen: START, moves: ["e2e4"], depth: 5, multiPv: 1 }).then(() => order.push("b"));
    // Answer each "go" in turn; the second go must not be sent before the first bestmove.
    await new Promise((r) => setTimeout(r, 0));
    expect(fake.sent.filter((c) => c.startsWith("go"))).toHaveLength(1);
    fake.emit(`info depth 5 score cp ${n++} pv e2e4`);
    fake.emit("bestmove e2e4");
    await new Promise((r) => setTimeout(r, 0));
    expect(fake.sent.filter((c) => c.startsWith("go"))).toHaveLength(2);
    fake.emit("info depth 5 score cp 1 pv e7e5");
    fake.emit("bestmove e7e5");
    await Promise.all([a, b]);
    expect(order).toEqual(["a", "b"]);
  });

  it("sends stop on timeout and still returns the result", async () => {
    const fake = fakeTransport((command) => {
      if (command === "stop") return ["info depth 3 score cp 5 pv e2e4", "bestmove e2e4"];
      return standardReplies(undefined)(command);
    });
    const engine = new UciEngine(fake.transport, { searchTimeoutMs: 20 });
    const result = await engine.analyse({ startFen: START, moves: [], depth: 30, multiPv: 1 });
    expect(fake.sent).toContain("stop");
    expect(result.bestMove).toBe("e2e4");
  });

  it("fails and terminates when the engine ignores stop", async () => {
    const fake = fakeTransport(standardReplies(undefined));
    const engine = new UciEngine(fake.transport, { searchTimeoutMs: 10, stopGraceMs: 10 });
    await expect(engine.analyse({ startFen: START, moves: [], depth: 30, multiPv: 1 })).rejects.toMatchObject({
      code: "timeout",
    });
    expect(fake.isTerminated()).toBe(true);
    await expect(engine.analyse({ startFen: START, moves: [], depth: 1, multiPv: 1 })).rejects.toBeInstanceOf(EngineError);
  });

  it("stops the search when aborted", async () => {
    const fake = fakeTransport((command) => {
      if (command === "stop") return ["bestmove e2e4"];
      return standardReplies(undefined)(command);
    });
    const engine = new UciEngine(fake.transport);
    await engine.init();
    const controller = new AbortController();
    const pending = engine.analyse({ startFen: START, moves: [], depth: 30, multiPv: 1 }, controller.signal);
    await new Promise((r) => setTimeout(r, 0));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(fake.sent).toContain("stop");
  });

  it("rejects pending work when the worker crashes", async () => {
    const fake = fakeTransport(standardReplies(undefined));
    const engine = new UciEngine(fake.transport);
    await engine.init();
    const pending = engine.analyse({ startFen: START, moves: [], depth: 30, multiPv: 1 });
    await new Promise((r) => setTimeout(r, 0));
    fake.crash("wasm trap");
    await expect(pending).rejects.toMatchObject({ code: "crashed" });
  });

  it("reports a load failure when uciok never arrives", async () => {
    const fake = fakeTransport(() => undefined);
    const engine = new UciEngine(fake.transport, { initTimeoutMs: 10 });
    await expect(engine.init()).rejects.toMatchObject({ code: "load-failed" });
  });
});
