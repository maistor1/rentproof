"use client";

import { useEffect, type Dispatch } from "react";
import type { FlowAction } from "@/lib/capture/flowTypes";

// Long enough to see the photo land in the strip, short enough to keep the
// worker moving. Kept under reduced motion: it's dwell time, not animation.
export const ADVANCE_DELAY_MS = 600;

export function useAutoAdvance(pendingAdvance: string | null, dispatch: Dispatch<FlowAction>): void {
  useEffect(() => {
    if (pendingAdvance === null) return;
    const id = setTimeout(() => dispatch({ type: "advance", uploadId: pendingAdvance }), ADVANCE_DELAY_MS);
    return () => clearTimeout(id);
  }, [pendingAdvance, dispatch]);
}
