"use client";

import { CaptureShell } from "@/components/capture/CaptureShell";
import { formatElapsed, useElapsedSeconds } from "@/components/capture/hooks/useElapsedSeconds";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { PhotoGrid } from "@/components/ui/PhotoGrid";
import { slotTone } from "@/lib/capture/flowSelectors";
import type { CaptureFlowState } from "@/lib/capture/flowTypes";
import { SLOTS } from "@/lib/types";

export const SLOW_AFTER_SECONDS = 45;

interface InspectionWaitProps {
  state: CaptureFlowState;
  onRetry: () => void;
  onBack: () => void;
}

// 10–30 s with nothing to do: the scanning grid is the focal point, and the
// timer proves the app is alive. No fake per-slot progress.
export function InspectionWait({ state, onRetry, onBack }: InspectionWaitProps) {
  const { status, error, startedAt } = state.inspection;
  const seconds = useElapsedSeconds(status === "running" ? startedAt : null);
  const failed = status === "failed";
  const items = SLOTS.map((slot) => ({ slot, src: state.slots[slot].previewUrl, tone: slotTone(state, slot) }));
  const meta = failed
    ? "Your photos are saved."
    : `${formatElapsed(seconds)} · ${seconds >= SLOW_AFTER_SECONDS ? "Still working…" : "usually 10 to 30 s"}`;

  return (
    <CaptureShell
      title={failed ? "Damage check stopped" : "Checking for damage"}
      meta={<span aria-live="polite">{meta}</span>}
      notice={error && <ErrorNotice message={error} />}
      primary={failed ? { label: "Try again", onClick: onRetry } : null}
      secondary={failed ? { label: "Back to photos", onClick: onBack } : undefined}
    >
      <PhotoGrid items={items} layout="grid" scanning={!failed} />
    </CaptureShell>
  );
}
