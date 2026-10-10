import type { CaptureFlowState, Tone } from "@/lib/capture/flowTypes";
import { SLOTS, type Slot } from "@/lib/types";

export function slotTone(state: CaptureFlowState, slot: Slot): Tone {
  const s = state.slots[slot];
  if (s.status === "uploading") return "uploading";
  if (s.status === "done") return "done";
  if (s.status === "error") return "problem";
  if (state.step === "capture" && state.current === slot) return "current";
  if (s.retakeReason) return "problem";
  return "empty";
}

export interface Segment {
  slot: Slot;
  tone: Tone;
}

export function progressSegments(state: CaptureFlowState): Segment[] {
  return SLOTS.map((slot) => ({ slot, tone: slotTone(state, slot) }));
}

export function toneMap(state: CaptureFlowState): Record<Slot, Tone> {
  return Object.fromEntries(SLOTS.map((slot) => [slot, slotTone(state, slot)])) as Record<Slot, Tone>;
}

// Drives "3 of 6": a photo counts as soon as the worker accepted it.
export function acceptedCount(state: CaptureFlowState): number {
  return SLOTS.filter((slot) => ["done", "uploading"].includes(state.slots[slot].status)).length;
}

export function firstOpenSlot(state: CaptureFlowState): Slot | null {
  return state.queue.find((slot) => state.slots[slot].status === "empty") ?? null;
}

// Next empty slot after the current one, wrapping around the queue.
export function nextOpenSlot(state: CaptureFlowState): Slot | null {
  const { queue } = state;
  const from = queue.indexOf(state.current) + 1;
  for (let i = 0; i < queue.length; i++) {
    const slot = queue[(from + i) % queue.length];
    if (state.slots[slot].status === "empty") return slot;
  }
  return null;
}

export interface UploadSummary {
  pending: Slot[];
  failed: Slot[];
}

export function uploadSummary(state: CaptureFlowState): UploadSummary {
  return {
    pending: SLOTS.filter((slot) => state.slots[slot].status === "uploading"),
    failed: SLOTS.filter((slot) => state.slots[slot].status === "error"),
  };
}

export function referencedPreviewUrls(state: CaptureFlowState): ReadonlySet<string> {
  const urls = SLOTS.map((slot) => state.slots[slot].previewUrl);
  return new Set([...urls, state.draft?.previewUrl ?? null].filter((u): u is string => u !== null));
}

export type CompleteIntent = "retryUploads" | "wait" | "finish" | "inspect";

export interface CompletePrimary {
  intent: CompleteIntent;
  label: string;
  disabled: boolean;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// The single primary action on the end screen. Uploads gate everything else,
// so the damage check never starts before every photo reached the server.
export function completePrimary(state: CaptureFlowState): CompletePrimary {
  const { pending, failed } = uploadSummary(state);
  if (failed.length > 0) {
    return { intent: "retryUploads", label: `Retry ${plural(failed.length, "upload")}`, disabled: false };
  }
  if (pending.length > 0) {
    return { intent: "wait", label: `Uploading ${plural(pending.length, "photo")}…`, disabled: true };
  }
  if (state.phase === "checkout") {
    return { intent: "finish", label: "Back to rentals", disabled: false };
  }
  const label = state.inspection.round > 1 ? "Run damage check again" : "Run damage check";
  return { intent: "inspect", label, disabled: false };
}
