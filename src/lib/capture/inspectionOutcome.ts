import type { RetakeRequest } from "@/lib/capture/flowTypes";
import type { DamageReport } from "@/lib/types";

// After this many damage checks we show the report even if a photo is still
// unclear, so a stubborn slot can't trap the worker in a loop.
export const MAX_INSPECTION_ROUNDS = 3;
export const RETAKE_FALLBACK = "Photo unclear. Take it again from the same spot.";

export type InspectionOutcome =
  | { kind: "report"; reportId: string }
  | { kind: "retake"; requests: RetakeRequest[] };

export function decideInspectionOutcome(report: DamageReport, round: number): InspectionOutcome {
  if (report.retakeSlots.length === 0 || round >= MAX_INSPECTION_ROUNDS) {
    return { kind: "report", reportId: report.id };
  }
  const requests = report.retakeSlots.map((slot) => ({
    slot,
    reason: report.slots.find((s) => s.slot === slot)?.retake_reason || RETAKE_FALLBACK,
  }));
  return { kind: "retake", requests };
}
