"use client";

import { useCallback, useEffect, useMemo, useRef, type Dispatch } from "react";
import type { LocalShots } from "@/components/capture/hooks/useLocalShots";
import type { FlowAction } from "@/lib/capture/flowTypes";
import { createSerialQueue } from "@/lib/capture/serialQueue";
import { uploadPhoto } from "@/lib/client/photosApi";
import { downscaleToJpeg } from "@/lib/image/canvasJpeg";
import type { Phase, Slot } from "@/lib/types";

interface UploaderInput {
  rentalId: string;
  phase: Phase;
  dispatch: Dispatch<FlowAction>;
  shots: LocalShots;
}

export const UNREADABLE_PHOTO = "Couldn't read that photo. Take it again.";
const LOST_PHOTO = "The photo was lost. Take it again.";

// Uploads run one at a time on purpose: each POST rewrites rentals.json, and
// FIFO order means the last accepted shot is the one that sticks.
export function useUploader({ rentalId, phase, dispatch, shots }: UploaderInput) {
  const queue = useMemo(() => createSerialQueue(), []);
  const latest = useRef<Partial<Record<Slot, string>>>({});
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const c = new AbortController();
    controller.current = c;
    return () => c.abort();
  }, []);

  const runUpload = useCallback(
    async (slot: Slot, uploadId: string, previewUrl: string) => {
      if (latest.current[slot] !== uploadId) return; // replaced by a newer shot
      const signal = controller.current?.signal;
      const blob = shots.get(previewUrl);
      if (!blob) return dispatch({ type: "uploadFailed", slot, uploadId, error: LOST_PHOTO });
      let file: Blob;
      try {
        file = await downscaleToJpeg(blob);
      } catch {
        return dispatch({ type: "processingFailed", slot, uploadId, reason: UNREADABLE_PHOTO });
      }
      if (signal?.aborted) return;
      const result = await uploadPhoto({ rentalId, slot, phase, file, signal });
      if (result.ok) dispatch({ type: "uploadSucceeded", slot, uploadId, photoId: result.value.id });
      else if (result.error.kind !== "cancelled") dispatch({ type: "uploadFailed", slot, uploadId, error: result.error.message });
    },
    [rentalId, phase, dispatch, shots],
  );

  const enqueue = useCallback(
    (slot: Slot, uploadId: string, previewUrl: string) => {
      latest.current = { ...latest.current, [slot]: uploadId };
      void queue.enqueue(() => runUpload(slot, uploadId, previewUrl));
    },
    [queue, runUpload],
  );

  return { enqueue };
}
