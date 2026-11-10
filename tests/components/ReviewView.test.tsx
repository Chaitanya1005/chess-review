// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ReviewView } from "@/components/review/ReviewView";
import type { GameAnalysis } from "@/lib/analysis/types";
import type { GameReview } from "@/lib/review/buildReview";
import { CLASSIFICATIONS } from "@/lib/analysis/moveClassification";
import { CLASSIFICATION_INFO } from "@/lib/review/classificationInfo";
import fixture from "../fixtures/opera-review.json";

// Real Chessground board, real review data (frozen depth-16 Opera Game analysis); no engine.
const analysis = fixture.analysis as unknown as GameAnalysis;
const review = fixture.review as unknown as GameReview;
const lastPly = review.moves.length;

afterEach(cleanup);

function setup() {
  render(<ReviewView analysis={analysis} review={review} />);
  const board = () => screen.getByTestId("board");
  const panel = () => screen.getByTestId("move-panel");
  const selected = () => screen.getByTestId("move-list").querySelector("[aria-current=step]");
  return { board, panel, selected };
}

describe("ReviewView", () => {
  it("starts at the initial position", () => {
    const { board, panel, selected } = setup();
    expect(board().dataset.fen).toBe(analysis.positions[0].fen);
    expect(panel().textContent).toContain("Starting position");
    expect(selected()).toBeNull();
    expect(screen.getByRole("button", { name: "Previous move" })).toHaveProperty("disabled", true);
  });

  it("keeps board, move list and explanation on the same ply with the keyboard", () => {
    const { board, panel, selected } = setup();
    fireEvent.keyDown(window, { key: "End" });
    expect(board().dataset.fen).toBe(analysis.positions[lastPly].fen);
    expect(selected()?.textContent).toContain("Rd8#");
    expect(panel().textContent).toContain("17. Rd8#");
    expect(panel().textContent).toContain("Checkmate");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(board().dataset.fen).toBe(analysis.positions[lastPly - 2].fen);
    expect(selected()?.textContent).toContain("Qb8+");
    expect(panel().textContent).toContain("Brilliant");
    expect(panel().textContent).toContain("gives up the queen");

    fireEvent.keyDown(window, { key: "Home" });
    expect(board().dataset.fen).toBe(analysis.positions[0].fen);
  });

  it("ignores shortcuts while typing in a form field", () => {
    const { board } = setup();
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(board().dataset.fen).toBe(analysis.positions[0].fen);
    input.remove();
  });

  it("jumps to a move clicked in the move list and shows the best move", () => {
    const { board, panel } = setup();
    fireEvent.click(screen.getByRole("button", { name: "6... Nf6, Mistake" }));
    expect(board().dataset.fen).toBe(analysis.positions[12].fen);
    expect(panel().textContent).toContain("Mistake");
    expect(within(panel()).getByText("Qf6", { selector: "span" })).toBeTruthy();
    expect(panel().textContent).toContain("This loses a pawn.");
  });

  it("navigates with the buttons and flips the board", () => {
    const { board } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Next move" }));
    expect(board().dataset.fen).toBe(analysis.positions[1].fen);
    const top = () => screen.getAllByTestId(/^player-/)[0].dataset.testid;
    expect(top()).toBe("player-b");
    fireEvent.click(screen.getByRole("button", { name: "Flip board" }));
    expect(board().dataset.orientation).toBe("b");
    expect(top()).toBe("player-w");
  });

  it("shows statistics that reconcile with the move list", () => {
    setup();
    fireEvent.click(screen.getByRole("tab", { name: "Stats" }));
    const stats = screen.getByTestId("stats-panel");
    expect(within(stats).getByTestId("accuracy-w").textContent).toBe(review.players.w.accuracy!.toFixed(1));
    expect(within(stats).getByTestId("accuracy-b").textContent).toBe(review.players.b.accuracy!.toFixed(1));
    expect(stats.textContent).toContain("Experimental");
    expect(stats.textContent).toContain("not calibrated");

    for (const color of ["w", "b"] as const) {
      for (const c of CLASSIFICATIONS) {
        const inList = review.moves.filter((m) => m.color === color && m.classification === c).length;
        expect(within(stats).getByTestId(`count-${color}-${c}`).textContent).toBe(String(inList));
      }
    }
    expect(within(stats).getByTestId("review-settings").textContent).toContain("depth 16");
  });

  it("labels every move in the list with exactly one classification", () => {
    setup();
    const buttons = screen.getByTestId("move-list").querySelectorAll("button[data-ply]");
    expect(buttons.length).toBe(lastPly);
    buttons.forEach((b) => {
      const labels = CLASSIFICATIONS.filter((c) => b.getAttribute("aria-label")?.endsWith(CLASSIFICATION_INFO[c].label));
      expect(labels.length).toBe(1);
    });
  });
});
