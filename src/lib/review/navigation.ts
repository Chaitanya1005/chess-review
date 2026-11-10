import type { Color } from "../engine/types";

/**
 * Review-screen view state (TECHNICAL_ARCHITECTURE.md §10). `ply` is the selected position:
 * 0 = starting position, i = position after move i. Board, move list, graph and explanation all
 * read this one value, so they always show the same ply (product acceptance criterion 3).
 */
export interface ReviewViewState {
  ply: number;
  lastPly: number;
  orientation: Color;
}

export type ReviewViewAction =
  | { type: "first" }
  | { type: "prev" }
  | { type: "next" }
  | { type: "last" }
  | { type: "select"; ply: number }
  | { type: "flip" };

export function initialViewState(lastPly: number, orientation: Color = "w"): ReviewViewState {
  return { ply: 0, lastPly, orientation };
}

export function reviewViewReducer(state: ReviewViewState, action: ReviewViewAction): ReviewViewState {
  const clamp = (ply: number) => Math.max(0, Math.min(state.lastPly, Math.round(ply)));
  switch (action.type) {
    case "first":
      return { ...state, ply: 0 };
    case "prev":
      return { ...state, ply: clamp(state.ply - 1) };
    case "next":
      return { ...state, ply: clamp(state.ply + 1) };
    case "last":
      return { ...state, ply: state.lastPly };
    case "select":
      return Number.isFinite(action.ply) ? { ...state, ply: clamp(action.ply) } : state;
    case "flip":
      return { ...state, orientation: state.orientation === "w" ? "b" : "w" };
  }
}

/** Keyboard shortcuts (FR-BOARD-2). Returns undefined for keys the review does not handle. */
export function keyToAction(key: string): ReviewViewAction | undefined {
  switch (key) {
    case "ArrowLeft":
      return { type: "prev" };
    case "ArrowRight":
      return { type: "next" };
    case "Home":
    case "ArrowUp":
      return { type: "first" };
    case "End":
    case "ArrowDown":
      return { type: "last" };
    case "f":
    case "F":
      return { type: "flip" };
    default:
      return undefined;
  }
}
