import { isSlot } from "@/lib/slots";
import type { DamageReport, Photo } from "@/lib/types";

// Minimal shape checks for API replies. Enough to fail with a clear message
// instead of crashing deep inside a component.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isPhoto(value: unknown): value is Photo {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.rentalId === "string" &&
    isSlot(value.slot) &&
    (value.phase === "checkout" || value.phase === "return")
  );
}

export function isDamageReport(value: unknown): value is DamageReport {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.rentalId === "string" &&
    Array.isArray(value.slots) &&
    Array.isArray(value.findings) &&
    Array.isArray(value.retakeSlots) &&
    value.retakeSlots.every(isSlot)
  );
}
