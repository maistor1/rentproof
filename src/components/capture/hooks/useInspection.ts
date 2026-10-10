"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, type Dispatch } from "react";
import type { FlowAction } from "@/lib/capture/flowTypes";
import { decideInspectionOutcome } from "@/lib/capture/inspectionOutcome";
import { runInspection } from "@/lib/client/inspectApi";

export const PHOTO_NOT_ON_SERVER = "This photo didn't reach the server. Take it again.";

interface InspectionInput {
  rentalId: string;
  round: number;
  dispatch: Dispatch<FlowAction>;
}

// Runs the damage check, then either opens the report or sends the worker
// back to the slots the model couldn't read.
export function useInspection({ rentalId, round, dispatch }: InspectionInput): { run: () => void } {
  const router = useRouter();
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(async () => {
    if (inFlight.current) return; // double taps
    inFlight.current = true;
    const c = new AbortController();
    controller.current = c;
    dispatch({ type: "inspectionStarted", at: Date.now() });
    try {
      const result = await runInspection(rentalId, c.signal);
      if (c.signal.aborted) return;
      if (!result.ok) {
        const missing = result.error.missingSlots ?? [];
        if (missing.length > 0) {
          dispatch({ type: "retakeRequested", requests: missing.map((slot) => ({ slot, reason: PHOTO_NOT_ON_SERVER })) });
        } else {
          dispatch({ type: "inspectionFailed", error: result.error.message });
        }
        return;
      }
      const outcome = decideInspectionOutcome(result.value, round);
      if (outcome.kind === "report") router.push(`/report/${encodeURIComponent(outcome.reportId)}`);
      else dispatch({ type: "retakeRequested", requests: outcome.requests });
    } finally {
      inFlight.current = false;
    }
  }, [rentalId, round, dispatch, router]);

  return { run: () => void run() };
}
