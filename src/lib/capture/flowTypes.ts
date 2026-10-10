import type { Phase, Slot } from "@/lib/types";

export type SlotStatus = "empty" | "uploading" | "done" | "error";

// What a slot looks like on screen. Drives every progress indicator.
export type Tone = "current" | "done" | "uploading" | "problem" | "empty";

export interface SlotState {
  readonly status: SlotStatus;
  readonly previewUrl: string | null; // local blob: URL, or the served photo on resume
  readonly photoId: string | null;
  readonly uploadId: string | null; // guards against stale upload results
  readonly error: string | null; // friendly upload error
  readonly retakeReason: string | null; // AI retake or unreadable photo
}

export type FlowStep = "intro" | "capture" | "complete" | "inspecting";

export type AsyncStatus = "idle" | "running" | "failed";

export interface InspectionState {
  readonly status: AsyncStatus;
  readonly error: string | null;
  readonly round: number; // 1 for the first damage check, +1 per retake round
  readonly startedAt: number | null;
}

export interface Draft {
  readonly slot: Slot;
  readonly previewUrl: string;
}

export interface CaptureFlowState {
  readonly phase: Phase;
  readonly step: FlowStep;
  readonly queue: readonly Slot[]; // all six, or only the retake slots
  readonly current: Slot;
  readonly draft: Draft | null;
  readonly pendingAdvance: string | null; // uploadId of the accept that scheduled the advance
  readonly slots: Readonly<Record<Slot, SlotState>>;
  readonly inspection: InspectionState;
}

export interface RetakeRequest {
  readonly slot: Slot;
  readonly reason: string;
}

export type FlowAction =
  | { type: "start" }
  | { type: "goToSlot"; slot: Slot }
  | { type: "captured"; previewUrl: string }
  | { type: "discardDraft" }
  | { type: "accepted"; uploadId: string }
  | { type: "uploadRetried"; slot: Slot; uploadId: string }
  | { type: "uploadSucceeded"; slot: Slot; uploadId: string; photoId: string }
  | { type: "uploadFailed"; slot: Slot; uploadId: string; error: string }
  | { type: "processingFailed"; slot: Slot; uploadId: string; reason: string }
  | { type: "advance"; uploadId: string }
  | { type: "inspectionStarted"; at: number }
  | { type: "inspectionFailed"; error: string }
  | { type: "inspectionDismissed" }
  | { type: "retakeRequested"; requests: readonly RetakeRequest[] };
