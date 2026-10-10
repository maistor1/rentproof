"use client";

import type { ReactNode } from "react";
import type { CameraControl } from "@/components/capture/cameraControl";
import { CaptureShell } from "@/components/capture/CaptureShell";
import { FlowHeader } from "@/components/capture/FlowHeader";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { PhotoGrid } from "@/components/ui/PhotoGrid";
import { slotTone } from "@/lib/capture/flowSelectors";
import type { CaptureFlowState } from "@/lib/capture/flowTypes";
import { SLOT_COPY } from "@/lib/slots";
import { SLOTS, type Slot } from "@/lib/types";

interface CaptureStepProps {
  state: CaptureFlowState;
  camera: CameraControl;
  viewfinder: ReactNode; // stays mounted during review so a live stream keeps running
  notice?: string | null;
  onAccept: () => void;
  onRetake: () => void;
  onSelectSlot: (slot: Slot) => void;
}

function Review({ previewUrl, label }: { previewUrl: string; label: string }) {
  return (
    <div className="animate-fade-in relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview */}
      <img src={previewUrl} alt={`${label} photo to review`} className="h-full w-full object-cover" />
    </div>
  );
}

export function CaptureStep({ state, camera, viewfinder, notice, onAccept, onRetake, onSelectSlot }: CaptureStepProps) {
  const { current, draft } = state;
  const copy = SLOT_COPY[current];
  const retakeReason = state.slots[current].retakeReason;
  const strip = SLOTS.map((slot) => ({
    slot,
    src: state.slots[slot].previewUrl,
    tone: slotTone(state, slot),
    animKey: state.slots[slot].uploadId,
  }));

  return (
    <CaptureShell
      header={<FlowHeader state={state} />}
      title={copy.label}
      meta={copy.hint}
      notice={
        <>
          {retakeReason && (
            <p className="text-body font-semibold text-problem-ink" data-testid="retake-reason">
              Retake: {retakeReason}
            </p>
          )}
          {notice && <ErrorNotice message={notice} />}
        </>
      }
      primary={
        draft ? { label: "Use photo", onClick: onAccept } : { label: camera.label, onClick: camera.trigger, disabled: camera.disabled }
      }
      secondary={draft ? { label: "Retake", onClick: onRetake } : undefined}
    >
      {/* Never keyed: remounting would restart the live camera on every slot. */}
      <div className={`relative rounded-xl ${draft ? "hidden" : ""}`}>
        {viewfinder}
        {retakeReason && (
          // Keyed by slot so the red flash replays once for each flagged slot.
          <span
            key={current}
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-flash-problem rounded-xl ring-2 ring-problem"
          />
        )}
      </div>
      {draft && <Review previewUrl={draft.previewUrl} label={copy.label} />}
      <PhotoGrid items={strip} layout="strip" onSelect={onSelectSlot} />
    </CaptureShell>
  );
}
