import { formatScore } from "@/lib/analysis/evaluation";
import type { GameReview, MoveReview } from "@/lib/review/buildReview";
import { CLASSIFICATION_INFO } from "@/lib/review/classificationInfo";
import { formatLine } from "@/lib/review/formatLine";
import { ClassificationBadge } from "./ClassificationBadge";

interface MovePanelProps {
  review: GameReview;
  move: MoveReview | undefined;
  explanation: string[];
}

function moveLabel(m: MoveReview) {
  return `${m.moveNumber}${m.color === "w" ? "." : "..."} ${m.san}`;
}

/** Selected-move panel (FR-EXP-1…3): classification, evaluations, best move, explanation and lines. */
export function MovePanel({ review, move, explanation }: MovePanelProps) {
  if (!move) {
    const w = review.players.w;
    const b = review.players.b;
    return (
      <section aria-live="polite" className="rounded-lg border border-line bg-surface p-4" data-testid="move-panel">
        <h2 className="text-base font-semibold">Starting position</h2>
        <p className="mt-1 text-sm text-muted">
          {w.name} {review.result === "1-0" ? "won" : review.result === "0-1" ? "lost" : review.result === "1/2-1/2" ? "drew" : "played"}
          {review.result === "*" ? " an unfinished game against " : " against "}
          {b.name}
          {review.result !== "*" ? ` (${review.result}).` : "."} Step through the moves with the arrow keys or the buttons below the board.
        </p>
      </section>
    );
  }

  const info = CLASSIFICATION_INFO[move.classification];
  const nextColor = move.color === "w" ? "b" : "w";
  const nextNumber = move.color === "w" ? move.moveNumber : move.moveNumber + 1;
  return (
    <section aria-live="polite" className="rounded-lg border border-line bg-surface p-4" data-testid="move-panel">
      <div className="flex items-center gap-2">
        <ClassificationBadge classification={move.classification} size="lg" />
        <h2 className="text-base font-semibold">
          <span className="font-mono">{moveLabel(move)}</span> <span style={{ color: info.color }}>{info.label}</span>
        </h2>
        <span className="ml-auto shrink-0 font-mono text-sm tabular-nums text-muted" title="Evaluation before → after (White's perspective)">
          {formatScore(move.evalBefore)} → {formatScore(move.evalAfter)}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-sm" data-testid="explanation">
        {explanation.map((s, i) => (
          <p key={i}>{s}</p>
        ))}
      </div>
      {!move.isEngineBest && move.bestMoveSan && (
        <p className="mt-3 text-sm">
          <span className="text-muted">Best move: </span>
          <span className="font-mono font-semibold">{move.bestMoveSan}</span>
        </p>
      )}
      {move.bestLineSan.length > 0 && !move.isEngineBest && (
        <p className="mt-1 text-xs text-muted">
          <span>Engine line: </span>
          <span className="font-mono">{formatLine(move.bestLineSan, move.moveNumber, move.color)}</span>
        </p>
      )}
      {move.playedLineSan.length > 0 && (
        <p className="mt-1 text-xs text-muted">
          <span>{move.isEngineBest ? "Engine continuation: " : "After the move played: "}</span>
          <span className="font-mono">{formatLine(move.playedLineSan, nextNumber, nextColor)}</span>
        </p>
      )}
    </section>
  );
}
