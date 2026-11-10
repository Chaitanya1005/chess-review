// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { HomeClient } from "@/components/home/HomeClient";
import { clearPendingGame, loadPendingGame } from "@/hooks/pendingGame";

beforeEach(() => {
  push.mockReset();
  clearPendingGame();
});
afterEach(cleanup);

const textarea = () => screen.getByLabelText("Paste a PGN") as HTMLTextAreaElement;
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Review game" }));

describe("HomeClient", () => {
  it("asks for input when the box is empty", () => {
    render(<HomeClient />);
    submit();
    expect(screen.getByRole("alert").textContent).toBe("Paste a PGN or choose a file.");
    expect(push).not.toHaveBeenCalled();
  });

  it("names the illegal move and does not start a review", () => {
    render(<HomeClient />);
    fireEvent.change(textarea(), { target: { value: "1. e4 e5 2. Ke3" } });
    submit();
    expect(screen.getByRole("alert").textContent).toContain("2. Ke3");
    expect(push).not.toHaveBeenCalled();
  });

  it("rejects unsupported variants", () => {
    render(<HomeClient />);
    fireEvent.change(textarea(), { target: { value: '[Variant "Atomic"]\n\n1. e4 e5' } });
    submit();
    expect(screen.getByRole("alert").textContent).toContain("Only standard chess");
  });

  it("loads a sample game and hands it to the review route with the chosen preset", () => {
    render(<HomeClient />);
    fireEvent.click(screen.getByRole("button", { name: /Opera Game/ }));
    expect(textarea().value).toContain("Paul Morphy");
    fireEvent.click(screen.getByLabelText("Deep"));
    submit();
    expect(push).toHaveBeenCalledWith("/review/");
    const pending = loadPendingGame();
    expect(pending?.pgn).toContain("17. Rd8#");
    expect(pending?.presetId).toBe("deep");
  });

  it("reads an uploaded PGN file in the browser", async () => {
    const { container } = render(<HomeClient />);
    const input = container.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File(['[White "A"]\n[Black "B"]\n\n1. e4 e5 *'], "game.pgn", { type: "" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText("Loaded game.pgn")).toBeTruthy();
    expect(textarea().value).toBe('[White "A"]\n[Black "B"]\n\n1. e4 e5 *');
  });

  it("rejects files that are not PGNs", async () => {
    const { container } = render(<HomeClient />);
    const input = container.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File([new Uint8Array([137, 80, 78, 71])], "photo.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("does not look like a PGN"));
  });

  it("restores the previous game when coming back from a review", () => {
    sessionStorage.setItem("chess-review:pending-game", JSON.stringify({ pgn: "1. d4 d5 *", presetId: "fast" }));
    render(<HomeClient />);
    expect(textarea().value).toBe("1. d4 d5 *");
    expect((screen.getByLabelText("Fast") as HTMLInputElement).checked).toBe(true);
  });
});
