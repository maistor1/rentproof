import { firstOpenSlot, nextOpenSlot } from "@/lib/capture/flowSelectors";
import type { CaptureFlowState, FlowAction, RetakeRequest, SlotState } from "@/lib/capture/flowTypes";
import { EMPTY_SLOT } from "@/lib/capture/initialState";
import type { Slot } from "@/lib/types";

// One pure reducer for check-out and return. Every handler returns a new
// state; actions that don't apply return the same object so React skips work.

function withSlot(state: CaptureFlowState, slot: Slot, patch: Partial<SlotState>): CaptureFlowState {
  return { ...state, slots: { ...state.slots, [slot]: { ...state.slots[slot], ...patch } } };
}

function captureOrComplete(state: CaptureFlowState, slot: Slot | null): CaptureFlowState {
  return slot
    ? { ...state, step: "capture", current: slot, draft: null, pendingAdvance: null }
    : { ...state, step: "complete", draft: null, pendingAdvance: null };
}

function isCurrentUpload(state: CaptureFlowState, slot: Slot, uploadId: string): boolean {
  return state.slots[slot].uploadId === uploadId;
}

function onAccepted(state: CaptureFlowState, uploadId: string): CaptureFlowState {
  const { draft } = state;
  if (!draft) return state;
  const next = withSlot(state, draft.slot, {
    status: "uploading",
    previewUrl: draft.previewUrl,
    photoId: null,
    uploadId,
    error: null,
    retakeReason: null,
  });
  return { ...next, draft: null, pendingAdvance: uploadId };
}

function onProcessingFailed(state: CaptureFlowState, slot: Slot, uploadId: string, reason: string) {
  if (!isCurrentUpload(state, slot, uploadId)) return state;
  const next = withSlot(state, slot, { ...EMPTY_SLOT, retakeReason: reason });
  // If the worker already reached the end screen, bring them back to this slot.
  if (next.step === "complete") return captureOrComplete(next, slot);
  // Still on this slot: cancel the auto-advance so they retake it right away.
  return next.pendingAdvance === uploadId ? { ...next, pendingAdvance: null } : next;
}

function onRetakeRequested(state: CaptureFlowState, requests: readonly RetakeRequest[]) {
  if (requests.length === 0) return state;
  const reset = requests.reduce(
    (s, { slot, reason }) => withSlot(s, slot, { ...EMPTY_SLOT, retakeReason: reason }),
    state,
  );
  const queue = requests.map((r) => r.slot);
  const inspection = { status: "idle", error: null, round: state.inspection.round + 1, startedAt: null } as const;
  return { ...captureOrComplete({ ...reset, queue }, queue[0]), inspection };
}

function inspectionReducer(state: CaptureFlowState, action: FlowAction): CaptureFlowState {
  switch (action.type) {
    case "inspectionStarted":
      return {
        ...state,
        step: "inspecting",
        inspection: { ...state.inspection, status: "running", error: null, startedAt: action.at },
      };
    case "inspectionFailed":
      return { ...state, inspection: { ...state.inspection, status: "failed", error: action.error } };
    case "inspectionDismissed":
      return { ...state, step: "complete", inspection: { ...state.inspection, status: "idle", error: null } };
    case "retakeRequested":
      return onRetakeRequested(state, action.requests);
    default:
      return state;
  }
}

export function captureFlowReducer(state: CaptureFlowState, action: FlowAction): CaptureFlowState {
  switch (action.type) {
    case "start":
      return captureOrComplete(state, firstOpenSlot(state));
    case "goToSlot":
      return captureOrComplete(state, action.slot);
    case "captured":
      if (state.step !== "capture") return state;
      return { ...state, draft: { slot: state.current, previewUrl: action.previewUrl } };
    case "discardDraft":
      return { ...state, draft: null };
    case "accepted":
      return onAccepted(state, action.uploadId);
    case "uploadRetried":
      if (state.slots[action.slot].status !== "error") return state;
      return withSlot(state, action.slot, { status: "uploading", uploadId: action.uploadId, error: null });
    case "uploadSucceeded":
      if (!isCurrentUpload(state, action.slot, action.uploadId)) return state;
      return withSlot(state, action.slot, { status: "done", photoId: action.photoId, error: null });
    case "uploadFailed":
      if (!isCurrentUpload(state, action.slot, action.uploadId)) return state;
      return withSlot(state, action.slot, { status: "error", error: action.error });
    case "processingFailed":
      return onProcessingFailed(state, action.slot, action.uploadId, action.reason);
    case "advance":
      if (state.pendingAdvance !== action.uploadId) return state;
      return captureOrComplete(state, nextOpenSlot(state));
    default:
      return state.phase === "return" ? inspectionReducer(state, action) : state;
  }
}
