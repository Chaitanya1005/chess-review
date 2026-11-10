import type { Score } from "../engine/types";
import { REVIEW_CONFIG, type ReviewConfig } from "../analysis/config";
import { expectedPointsWhite } from "../analysis/expectedPoints";

/**
 * Evaluation-graph values (FR-GRAPH-1/2): White's expected score in percent for every position,
 * on the same win-probability scale the classification uses, so large evaluations are compressed
 * and mate sits at the edge (100 or 0).
 */
export function graphValues(evaluations: Score[], cfg: ReviewConfig = REVIEW_CONFIG): number[] {
  return evaluations.map((s) => 100 * expectedPointsWhite(s, cfg.expectedPoints));
}

export interface GraphGeometry {
  width: number;
  height: number;
}

/** x coordinate of position `ply` (0 … n). */
export function plyToX(ply: number, count: number, g: GraphGeometry): number {
  return count <= 1 ? 0 : (ply / (count - 1)) * g.width;
}

/** y coordinate of a White-percent value: 100 at the top, 0 at the bottom. */
export function valueToY(value: number, g: GraphGeometry): number {
  return ((100 - Math.max(0, Math.min(100, value))) / 100) * g.height;
}

/** Nearest position index for a horizontal coordinate (click / tap on the graph, FR-GRAPH-4). */
export function xToPly(x: number, count: number, g: GraphGeometry): number {
  if (count <= 1 || g.width <= 0) return 0;
  const ply = Math.round((x / g.width) * (count - 1));
  return Math.max(0, Math.min(count - 1, ply));
}

/**
 * SVG path for White's area: from the bottom-left corner, along the evaluation line, down to the
 * bottom-right corner. Filling it light over a dark background shows White's share.
 */
export function areaPath(values: number[], g: GraphGeometry): string {
  if (values.length === 0) return "";
  const pts = values.map((v, i) => `${round(plyToX(i, values.length, g))},${round(valueToY(v, g))}`);
  const lastX = round(plyToX(values.length - 1, values.length, g));
  return `M0,${g.height} L${pts.join(" L")} L${lastX},${g.height} Z`;
}

/** SVG polyline points for the evaluation line itself. */
export function linePoints(values: number[], g: GraphGeometry): string {
  return values.map((v, i) => `${round(plyToX(i, values.length, g))},${round(valueToY(v, g))}`).join(" ");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
