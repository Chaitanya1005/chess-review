import type { ReviewViewAction } from "@/lib/review/navigation";

const BUTTONS: { action: ReviewViewAction["type"]; label: string; icon: string; key: string }[] = [
  { action: "first", label: "First position", icon: "⏮", key: "Home" },
  { action: "prev", label: "Previous move", icon: "◀", key: "←" },
  { action: "next", label: "Next move", icon: "▶", key: "→" },
  { action: "last", label: "Last position", icon: "⏭", key: "End" },
  { action: "flip", label: "Flip board", icon: "⇅", key: "F" },
];

/** Navigation buttons (FR-BOARD-2, MOB-2: at least 44×44 px). */
export function NavControls({ ply, lastPly, dispatch }: { ply: number; lastPly: number; dispatch: (a: ReviewViewAction) => void }) {
  return (
    <div className="flex items-center justify-center gap-1.5" role="toolbar" aria-label="Board navigation">
      {BUTTONS.map((b) => {
        const disabled = (b.action === "first" || b.action === "prev") ? ply === 0 : (b.action === "next" || b.action === "last") ? ply === lastPly : false;
        return (
          <button
            key={b.action}
            type="button"
            aria-label={b.label}
            title={`${b.label} (${b.key})`}
            disabled={disabled}
            onClick={() => dispatch({ type: b.action } as ReviewViewAction)}
            className="flex h-11 min-w-11 flex-1 items-center justify-center rounded-md bg-surface-2 text-lg hover:bg-line disabled:opacity-40 sm:max-w-20"
          >
            <span aria-hidden="true">{b.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
