/**
 * Analysis presets offered in the UI (docs/DECISIONS.md D-021). The library default
 * (DEFAULT_DEPTH = 14, D-008) is unchanged; the UI defaults to depth 16 because depth 14 misses
 * sacrificial mates that matter for Brilliant/Great/Miss (D-017).
 */
export interface AnalysisPreset {
  id: "fast" | "standard" | "deep";
  label: string;
  depth: number;
  description: string;
}

export const ANALYSIS_PRESETS: AnalysisPreset[] = [
  { id: "fast", label: "Fast", depth: 12, description: "Depth 12. Quickest; may miss deeper tactics." },
  { id: "standard", label: "Standard", depth: 16, description: "Depth 16. About a minute for a 40-move game on a recent laptop." },
  { id: "deep", label: "Deep", depth: 18, description: "Depth 18. Slower, especially on phones." },
];

export const DEFAULT_PRESET_ID: AnalysisPreset["id"] = "standard";

export const ANALYSIS_MULTI_PV = 2;

export function presetById(id: string | undefined): AnalysisPreset {
  return ANALYSIS_PRESETS.find((p) => p.id === id) ?? ANALYSIS_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID)!;
}
