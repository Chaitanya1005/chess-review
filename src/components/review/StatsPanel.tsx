import { CLASSIFICATIONS } from "@/lib/analysis/moveClassification";
import { GAME_PHASES } from "@/lib/analysis/gamePhases";
import type { GameReview, PlayerReview } from "@/lib/review/buildReview";
import { CLASSIFICATION_INFO } from "@/lib/review/classificationInfo";
import { ClassificationBadge } from "./ClassificationBadge";

const PHASE_LABEL = { opening: "Opening", middlegame: "Middlegame", endgame: "Endgame" } as const;

function acc(value: number | null) {
  return value === null ? "—" : value.toFixed(1);
}

function rating(p: PlayerReview) {
  return p.rating ? String(p.rating.value) : "—";
}

/** Per-player statistics (FR-STAT-1…3, FR-ACC, FR-RAT). Counts come straight from the move list. */
export function StatsPanel({ review }: { review: GameReview }) {
  const { w, b } = review.players;
  const uncalibrated = (w.rating && !w.rating.calibrated) || (b.rating && !b.rating.calibrated);
  return (
    <div className="space-y-5 text-sm" data-testid="stats-panel">
      <table className="w-full border-collapse">
        <caption className="sr-only">Accuracy, estimated game rating and move classifications for each player</caption>
        <thead>
          <tr className="text-left text-xs text-muted">
            <th scope="col" className="pb-2 font-medium" />
            <th scope="col" className="w-24 truncate pb-2 text-right font-semibold text-foreground" title={w.name}>
              {w.name}
            </th>
            <th scope="col" className="w-24 truncate pb-2 text-right font-semibold text-foreground" title={b.name}>
              {b.name}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-line">
            <th scope="row" className="py-2 text-left font-medium">
              Accuracy
            </th>
            <td className="py-2 text-right text-lg font-semibold tabular-nums" data-testid="accuracy-w">
              {acc(w.accuracy)}
            </td>
            <td className="py-2 text-right text-lg font-semibold tabular-nums" data-testid="accuracy-b">
              {acc(b.accuracy)}
            </td>
          </tr>
          <tr className="border-t border-line">
            <th scope="row" className="py-2 text-left font-medium">
              Estimated game rating
              {uncalibrated && (
                <span className="ml-1.5 rounded bg-[#fef3c7] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#92400e]">
                  Experimental
                </span>
              )}
            </th>
            <td className="py-2 text-right tabular-nums" data-testid="rating-w">
              {rating(w)}
            </td>
            <td className="py-2 text-right tabular-nums" data-testid="rating-b">
              {rating(b)}
            </td>
          </tr>
          {CLASSIFICATIONS.map((c) => (
            <tr key={c} className="border-t border-line" data-testid={`count-row-${c}`}>
              <th scope="row" className="py-1.5 text-left font-normal">
                <span className="flex items-center gap-2">
                  <ClassificationBadge classification={c} size="sm" />
                  {CLASSIFICATION_INFO[c].label}
                </span>
              </th>
              <td className="py-1.5 text-right tabular-nums" data-testid={`count-w-${c}`}>
                {w.counts[c]}
              </td>
              <td className="py-1.5 text-right tabular-nums" data-testid={`count-b-${c}`}>
                {b.counts[c]}
              </td>
            </tr>
          ))}
          <tr className="border-t border-line text-muted">
            <th scope="row" className="py-1.5 text-left font-normal">
              Moves
            </th>
            <td className="py-1.5 text-right tabular-nums">{w.moveCount}</td>
            <td className="py-1.5 text-right tabular-nums">{b.moveCount}</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse">
        <caption className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">Accuracy by phase</caption>
        <tbody>
          {GAME_PHASES.map((phase) => (
            <tr key={phase} className="border-t border-line">
              <th scope="row" className="py-1.5 text-left font-normal">
                {PHASE_LABEL[phase]}
              </th>
              <td className="w-24 py-1.5 text-right tabular-nums" title={`${w.phases[phase].moveCount} moves`}>
                {acc(w.phases[phase].accuracy)}
              </td>
              <td className="w-24 py-1.5 text-right tabular-nums" title={`${b.phases[phase].moveCount} moves`}>
                {acc(b.phases[phase].accuracy)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-2 rounded-md bg-surface-2 p-3 text-xs text-muted">
        <p>
          Accuracy follows the method Lichess publishes. Labels use thresholds from Chess.com&apos;s public help pages plus our own
          rules for Brilliant, Great and Miss. These are approximations: results will differ from Chess.com and Lichess, and they
          have not been benchmarked yet.
        </p>
        {uncalibrated && (
          <p>
            The estimated game rating is experimental and not calibrated against real ratings. It is not an Elo, FIDE or any
            site&apos;s rating.
          </p>
        )}
        <p data-testid="review-settings">
          {review.settings.engine} · depth {review.settings.depth} · MultiPV {review.settings.multiPv} · classification{" "}
          {review.classificationVersion}
        </p>
      </div>
    </div>
  );
}
