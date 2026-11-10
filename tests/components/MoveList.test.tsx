// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MoveList } from "@/components/review/MoveList";
import type { MoveReview } from "@/lib/review/buildReview";

afterEach(cleanup);

const move = (ply: number, moveNumber: number, color: "w" | "b", san: string): MoveReview =>
  ({ ply, moveNumber, color, san, classification: "best" }) as MoveReview;

describe("MoveList", () => {
  it("pairs moves by move number and handles a game that starts with Black to move", () => {
    // Custom start position (FR-PGN-6): Black moves first, at move 20.
    const moves = [move(1, 20, "b", "Kf8"), move(2, 21, "w", "Qh8+"), move(3, 21, "b", "Ke7")];
    const onSelect = vi.fn();
    render(<MoveList moves={moves} ply={2} onSelect={onSelect} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toBe("20.★Kf8");
    expect(rows[1].textContent).toBe("21.★Qh8+★Ke7");
    expect(screen.getByRole("button", { name: "21. Qh8+, Best" }).getAttribute("aria-current")).toBe("step");
    fireEvent.click(screen.getByRole("button", { name: "20... Kf8, Best" }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
