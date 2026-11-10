import type { Color, Score } from "@/lib/engine/types";
import { formatScore } from "@/lib/analysis/evaluation";

/** Vertical evaluation bar beside the board: White's expected score, White at the bottom when White is at the bottom. */
export function EvalBar({ whitePercent, score, orientation }: { whitePercent: number; score: Score; orientation: Color }) {
  const white = Math.max(0, Math.min(100, whitePercent));
  const label = formatScore(score);
  const whiteAhead = white >= 50;
  return (
    <div
      className={`relative flex w-5 shrink-0 overflow-hidden rounded-sm bg-[#3f3f46] sm:w-7 ${orientation === "w" ? "flex-col-reverse" : "flex-col"}`}
      role="meter"
      aria-label="Evaluation"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(white)}
      aria-valuetext={`${label} (White ${Math.round(white)}% expected score)`}
      data-testid="eval-bar"
    >
      <div className="bg-[#f5f5f4] transition-[height] duration-300" style={{ height: `${white}%` }} />
      <span
        className={`absolute left-0 right-0 text-center text-[9px] font-semibold sm:text-[10px] ${
          whiteAhead ? "text-[#27272a]" : "text-[#f5f5f4]"
        } ${whiteAhead === (orientation === "w") ? "bottom-1" : "top-1"}`}
      >
        {label}
      </span>
    </div>
  );
}
