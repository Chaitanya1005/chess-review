import type { Classification } from "@/lib/analysis/moveClassification";
import { CLASSIFICATION_INFO } from "@/lib/review/classificationInfo";

const SIZES = {
  sm: "h-4 w-4 text-[9px]",
  md: "h-5 w-5 text-[11px]",
  lg: "h-7 w-7 text-sm",
  board: "h-[min(5.5vw,1.9rem)] w-[min(5.5vw,1.9rem)] min-h-4 min-w-4 text-[min(2.6vw,0.85rem)] shadow-md ring-2 ring-white/80",
};

/** Coloured symbol for a classification. Always carries a text label for assistive tech (NFR-9). */
export function ClassificationBadge({ classification, size = "md" }: { classification: Classification; size?: keyof typeof SIZES }) {
  const info = CLASSIFICATION_INFO[classification];
  return (
    <span
      role="img"
      aria-label={info.label}
      title={info.label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none ${SIZES[size]}`}
      style={{ backgroundColor: info.color, color: info.textColor }}
    >
      <span aria-hidden="true">{info.symbol}</span>
    </span>
  );
}
