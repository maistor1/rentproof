import { CaptureShell } from "@/components/capture/CaptureShell";
import { FlowHeader } from "@/components/capture/FlowHeader";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { PhotoGrid } from "@/components/ui/PhotoGrid";
import type { PrimaryAction } from "@/components/ui/PrimaryButton";
import { slotTone, uploadSummary } from "@/lib/capture/flowSelectors";
import type { CaptureFlowState } from "@/lib/capture/flowTypes";
import { SLOTS, type Slot } from "@/lib/types";

interface CompleteStepProps {
  state: CaptureFlowState;
  title: string;
  meta: string;
  primary: PrimaryAction;
  onSelectSlot: (slot: Slot) => void;
}

// The payoff: six thumbnails turning green, one line, one action.
export function CompleteStep({ state, title, meta, primary, onSelectSlot }: CompleteStepProps) {
  const { failed } = uploadSummary(state);
  const firstError = failed.length > 0 ? state.slots[failed[0]].error : null;
  const items = SLOTS.map((slot) => ({ slot, src: state.slots[slot].previewUrl, tone: slotTone(state, slot) }));
  return (
    <CaptureShell
      header={<FlowHeader state={state} />}
      title={title}
      meta={meta}
      notice={firstError && <ErrorNotice message={firstError} />}
      primary={primary}
    >
      <PhotoGrid items={items} layout="grid" onSelect={onSelectSlot} />
      <p className="text-meta text-zinc-700">Tap a photo to take it again.</p>
    </CaptureShell>
  );
}
