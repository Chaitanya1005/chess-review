// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AnalysisState } from "@/hooks/useGameAnalysis";
import type { GameAnalysis } from "@/lib/analysis/types";
import fixture from "../fixtures/opera-review.json";

// The engine hook is replaced so the screen's states can be driven directly. The real engine path
// is covered by the integration tests and the browser run recorded in DEVELOPMENT_STATUS.md.
const hook = vi.hoisted(() => ({
  state: { status: "idle", progress: { done: 0, total: 0 }, analysis: null, error: null, warnings: [] } as AnalysisState,
  run: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock("@/hooks/useGameAnalysis", () => ({ useGameAnalysis: () => hook }));

import { ReviewScreen } from "@/components/review/ReviewScreen";
import { clearPendingGame, savePendingGame } from "@/hooks/pendingGame";
import { SAMPLE_GAMES } from "@/lib/pgn/samples";

const opera = SAMPLE_GAMES.find((g) => g.id === "opera")!.pgn;

function setState(s: Partial<AnalysisState>) {
  hook.state = { ...hook.state, ...s };
}

beforeEach(() => {
  clearPendingGame();
  hook.run.mockReset();
  hook.cancel.mockReset();
  setState({ status: "idle", progress: { done: 0, total: 0 }, analysis: null, error: null, warnings: [] });
});
afterEach(cleanup);

describe("ReviewScreen", () => {
  it("sends the user home when there is no game", async () => {
    render(<ReviewScreen />);
    expect(await screen.findByText("No game to review")).toBeTruthy();
    expect(hook.run).not.toHaveBeenCalled();
  });

  it("starts the analysis with the chosen preset and shows progress with cancel", async () => {
    savePendingGame({ pgn: opera, presetId: "fast" });
    setState({ status: "analysing", progress: { done: 17, total: 34 } });
    render(<ReviewScreen />);
    expect(await screen.findByText("Paul Morphy vs Duke Karl / Count Isouard")).toBeTruthy();
    expect(hook.run).toHaveBeenCalledWith(opera, { depth: 12, multiPv: 2 });
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("50");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(hook.cancel).toHaveBeenCalled();
  });

  it("offers a retry after an engine error", async () => {
    savePendingGame({ pgn: opera, presetId: "standard" });
    setState({ status: "error", error: "The analysis engine could not be loaded. Check your connection and try again." });
    render(<ReviewScreen />);
    expect((await screen.findByRole("alert")).textContent).toContain("could not be loaded");
    hook.run.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(hook.run).toHaveBeenCalledWith(opera, { depth: 16, multiPv: 2 });
  });

  it("renders the full review when the analysis is done", async () => {
    savePendingGame({ pgn: opera, presetId: "standard" });
    setState({ status: "done", analysis: fixture.analysis as unknown as GameAnalysis, warnings: ["The PGN contains 2 games. Only the first game is reviewed."] });
    render(<ReviewScreen />);
    expect(await screen.findByTestId("board")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Only the first game");
    expect(screen.getByTestId("player-w").textContent).toContain("98.2");
    expect(screen.getByTestId("player-b").textContent).toContain("82.4");
  });
});
