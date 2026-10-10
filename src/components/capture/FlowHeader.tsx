import { MachineMap } from "@/components/progress/MachineMap";
import { SlotProgress } from "@/components/progress/SlotProgress";
import { acceptedCount, progressSegments, toneMap } from "@/lib/capture/flowSelectors";
import type { CaptureFlowState } from "@/lib/capture/flowTypes";
import { slotLabel } from "@/lib/slots";

interface FlowHeaderProps {
  state: CaptureFlowState;
}

export function FlowHeader({ state }: FlowHeaderProps) {
  const count = acceptedCount(state);
  const announcement =
    state.step === "capture" ? `${slotLabel(state.current)}. ${count} of 6 photos taken.` : `${count} of 6 photos taken.`;
  return (
    <header className="flex items-center gap-4">
      <MachineMap tones={toneMap(state)} className="w-14 shrink-0" />
      <SlotProgress segments={progressSegments(state)} count={count} />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </header>
  );
}
