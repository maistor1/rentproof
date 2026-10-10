"use client";

import { useCallback, useEffect, useReducer, useRef, type Dispatch } from "react";
import { useAutoAdvance } from "@/components/capture/hooks/useAutoAdvance";
import { useLocalShots } from "@/components/capture/hooks/useLocalShots";
import { useUploader } from "@/components/capture/hooks/useUploader";
import { captureFlowReducer } from "@/lib/capture/flowReducer";
import { referencedPreviewUrls, uploadSummary } from "@/lib/capture/flowSelectors";
import type { CaptureFlowState, FlowAction } from "@/lib/capture/flowTypes";
import { createInitialFlowState } from "@/lib/capture/initialState";
import { photoUrl } from "@/lib/photoUrl";
import type { Phase, Rental, Slot } from "@/lib/types";

export interface CaptureFlowApi {
  state: CaptureFlowState;
  dispatch: Dispatch<FlowAction>;
  start(): void;
  goToSlot(slot: Slot): void;
  capture(blob: Blob): void; // preview shows immediately, upload starts on accept
  discardDraft(): void;
  accept(): void;
  retryFailedUploads(): void;
}

export function useCaptureFlow(rental: Rental, phase: Phase): CaptureFlowApi {
  const [state, dispatch] = useReducer(captureFlowReducer, undefined, () =>
    createInitialFlowState({ phase, savedPhotos: rental.photos[phase], toUrl: photoUrl }),
  );
  const shots = useLocalShots();
  const { enqueue } = useUploader({ rentalId: rental.id, phase, dispatch, shots });
  const counter = useRef(0);
  useAutoAdvance(state.pendingAdvance, dispatch);

  // Drop object URLs nothing shows any more (discarded drafts, AI retakes).
  useEffect(() => shots.retain(referencedPreviewUrls(state)), [state, shots]);

  // A ref counter, not crypto.randomUUID: that's missing on plain-HTTP LAN.
  const nextUploadId = useCallback((slot: Slot) => `${slot}-${++counter.current}`, []);

  const accept = useCallback(() => {
    const { draft } = state;
    if (!draft) return;
    const uploadId = nextUploadId(draft.slot);
    dispatch({ type: "accepted", uploadId });
    enqueue(draft.slot, uploadId, draft.previewUrl);
  }, [state, nextUploadId, enqueue]);

  const retryFailedUploads = useCallback(() => {
    for (const slot of uploadSummary(state).failed) {
      const previewUrl = state.slots[slot].previewUrl;
      if (!previewUrl) continue;
      const uploadId = nextUploadId(slot);
      dispatch({ type: "uploadRetried", slot, uploadId });
      enqueue(slot, uploadId, previewUrl);
    }
  }, [state, nextUploadId, enqueue]);

  return {
    state,
    dispatch,
    start: () => dispatch({ type: "start" }),
    goToSlot: (slot) => dispatch({ type: "goToSlot", slot }),
    capture: (blob) => dispatch({ type: "captured", previewUrl: shots.add(blob) }),
    discardDraft: () => dispatch({ type: "discardDraft" }),
    accept,
    retryFailedUploads,
  };
}
