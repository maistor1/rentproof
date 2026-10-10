import type { CaptureFlowState, SlotState } from "@/lib/capture/flowTypes";
import { SLOTS, type Phase, type Slot } from "@/lib/types";

export const EMPTY_SLOT: SlotState = {
  status: "empty",
  previewUrl: null,
  photoId: null,
  uploadId: null,
  error: null,
  retakeReason: null,
};

export interface InitialFlowInput {
  phase: Phase;
  savedPhotos: Partial<Record<Slot, string>>; // rental.photos[phase]
  toUrl: (photoId: string) => string;
}

// Slots that already have a saved photo start as done, so a refresh resumes.
export function createInitialFlowState({ phase, savedPhotos, toUrl }: InitialFlowInput): CaptureFlowState {
  const entries = SLOTS.map((slot): [Slot, SlotState] => {
    const photoId = savedPhotos[slot];
    return [slot, photoId ? { ...EMPTY_SLOT, status: "done", photoId, previewUrl: toUrl(photoId) } : EMPTY_SLOT];
  });
  const slots = Object.fromEntries(entries) as Record<Slot, SlotState>;
  return {
    phase,
    step: "intro",
    queue: SLOTS,
    current: SLOTS.find((slot) => slots[slot].status === "empty") ?? SLOTS[0],
    draft: null,
    pendingAdvance: null,
    slots,
    inspection: { status: "idle", error: null, round: 1, startedAt: null },
  };
}
