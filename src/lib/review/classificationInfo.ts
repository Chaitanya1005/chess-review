import type { Classification } from "../analysis/moveClassification";

export interface ClassificationInfo {
  label: string;
  /** Short symbol shown in badges. Standard annotation symbols where they exist; our own otherwise. */
  symbol: string;
  /** Badge colour (our own palette; no third-party assets or trade dress). */
  color: string;
  /** Symbol colour chosen for contrast against `color`. */
  textColor: string;
  /** True for labels worth marking on the evaluation graph (FR-GRAPH-3). */
  marked: boolean;
}

export const CLASSIFICATION_INFO: Record<Classification, ClassificationInfo> = {
  brilliant: { label: "Brilliant", symbol: "!!", color: "#8b5cf6", textColor: "#ffffff", marked: true },
  great: { label: "Great", symbol: "!", color: "#3b82f6", textColor: "#ffffff", marked: true },
  best: { label: "Best", symbol: "★", color: "#16a34a", textColor: "#ffffff", marked: false },
  excellent: { label: "Excellent", symbol: "✓", color: "#4ade80", textColor: "#111827", marked: false },
  good: { label: "Good", symbol: "○", color: "#94a3b8", textColor: "#111827", marked: false },
  inaccuracy: { label: "Inaccuracy", symbol: "?!", color: "#eab308", textColor: "#111827", marked: false },
  mistake: { label: "Mistake", symbol: "?", color: "#f97316", textColor: "#ffffff", marked: true },
  miss: { label: "Miss", symbol: "×", color: "#ec4899", textColor: "#ffffff", marked: true },
  blunder: { label: "Blunder", symbol: "??", color: "#dc2626", textColor: "#ffffff", marked: true },
};

/** "a brilliant move", "an inaccuracy", "a miss". */
export function classificationPhrase(c: Classification): string {
  switch (c) {
    case "inaccuracy":
      return "an inaccuracy";
    case "mistake":
      return "a mistake";
    case "miss":
      return "a miss";
    case "blunder":
      return "a blunder";
    case "excellent":
      return "an excellent move";
    case "best":
      return "the best move";
    default:
      return `a ${c} move`;
  }
}
