import { PhotoCompare } from "@/components/report/PhotoCompare";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { TextButton } from "@/components/ui/TextButton";
import type { ReviewDecision } from "@/lib/client/reviewApi";
import { slotLabel } from "@/lib/slots";
import type { ReviewedFinding } from "@/lib/types";

interface FindingCardProps {
  finding: ReviewedFinding;
  beforeId: string | undefined;
  afterId: string | undefined;
  busy?: boolean;
  error?: string | null;
  onDecide?: (status: ReviewDecision) => void; // review band only
}

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replaceAll("_", " ");

const DECIDE =
  "flex h-12 flex-1 items-center justify-center rounded-xl border-2 px-3 text-body font-semibold select-none " +
  "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50";

function Decided({ finding, busy, onUndo }: { finding: ReviewedFinding; busy: boolean; onUndo: () => void }) {
  const confirmed = finding.status === "confirmed";
  return (
    <div className="flex items-center justify-between gap-2">
      <p className={`text-body font-semibold ${confirmed ? "text-done-ink" : "text-zinc-700"}`}>
        {confirmed ? "Confirmed, charged" : "Rejected, not charged"}
      </p>
      {busy ? <span className="text-meta text-zinc-700">Saving…</span> : <TextButton label="Undo" onClick={onUndo} />}
    </div>
  );
}

// One finding: what, where, how sure, and the photo pair as proof. Decided
// review-band cards collapse to their outcome with an undo.
export function FindingCard({ finding, beforeId, afterId, busy = false, error = null, onDecide }: FindingCardProps) {
  const pending = finding.status === "needs_review";
  const decided = finding.status === "confirmed" || finding.status === "rejected";
  return (
    <article
      data-testid={`finding-${finding.id}`}
      className={`flex flex-col gap-3 rounded-xl border-2 bg-white p-3 ${pending ? "border-action" : "border-zinc-200"}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-body font-semibold">
            {sentence(finding.type)} ({finding.severity})
          </h3>
          <p className="text-meta text-zinc-700">
            {slotLabel(finding.slot)}: {finding.location}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-meta text-zinc-900">
          {Math.round(finding.confidence * 100)}% sure
        </span>
      </header>

      {!decided && (
        <>
          <PhotoCompare beforeId={beforeId} afterId={afterId} label={slotLabel(finding.slot)} box={finding.box} />
          <p className="text-meta text-zinc-700">{finding.evidence}</p>
        </>
      )}

      {error && <ErrorNotice message={error} />}

      {pending && onDecide && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecide("confirmed")}
            className={`${DECIDE} border-zinc-900 bg-zinc-900 text-white`}
          >
            Confirm damage
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecide("rejected")}
            className={`${DECIDE} border-zinc-300 bg-white text-zinc-900`}
          >
            Reject
          </button>
        </div>
      )}

      {decided && onDecide && <Decided finding={finding} busy={busy} onUndo={() => onDecide("needs_review")} />}
    </article>
  );
}
