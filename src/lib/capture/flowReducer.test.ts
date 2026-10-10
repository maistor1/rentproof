import { describe, expect, it } from "vitest";
import { captureFlowReducer } from "@/lib/capture/flowReducer";
import type { CaptureFlowState, FlowAction } from "@/lib/capture/flowTypes";
import { createInitialFlowState } from "@/lib/capture/initialState";
import type { Phase, Slot } from "@/lib/types";
import { allPhotos, deepFreeze } from "@/test/fixtures";

function fresh(phase: Phase = "checkout", saved: Partial<Record<Slot, string>> = {}) {
  return deepFreeze(createInitialFlowState({ phase, savedPhotos: saved, toUrl: (id) => `/p/${id}` }));
}

function run(state: CaptureFlowState, ...actions: FlowAction[]): CaptureFlowState {
  return actions.reduce((s, a) => deepFreeze(captureFlowReducer(s, a)), state);
}

// Capture and accept the current slot, then let the auto-advance fire.
function shoot(state: CaptureFlowState, n: number): CaptureFlowState {
  const id = `${state.current}-${n}`;
  return run(
    state,
    { type: "captured", previewUrl: `blob:${n}` },
    { type: "accepted", uploadId: id },
    { type: "advance", uploadId: id },
  );
}

describe("start", () => {
  it("opens the first slot", () => {
    const s = run(fresh(), { type: "start" });
    expect(s.step).toBe("capture");
    expect(s.current).toBe("front");
  });

  it("resumes at the first slot without a photo", () => {
    const s = run(fresh("checkout", { front: "a", rear: "b" }), { type: "start" });
    expect(s.current).toBe("left_side");
  });

  it("goes straight to complete when all photos exist", () => {
    const s = run(fresh("checkout", allPhotos("c")), { type: "start" });
    expect(s.step).toBe("complete");
  });
});

describe("capture, accept and advance", () => {
  it("keeps a draft until accepted, without touching the slot", () => {
    const s = run(fresh(), { type: "start" }, { type: "captured", previewUrl: "blob:1" });
    expect(s.draft).toEqual({ slot: "front", previewUrl: "blob:1" });
    expect(s.slots.front.status).toBe("empty");
  });

  it("ignores captures outside the capture step", () => {
    const s = run(fresh(), { type: "captured", previewUrl: "blob:1" });
    expect(s.draft).toBeNull();
  });

  it("discards a draft on retake", () => {
    const s = run(
      fresh(),
      { type: "start" },
      { type: "captured", previewUrl: "blob:1" },
      { type: "discardDraft" },
    );
    expect(s.draft).toBeNull();
  });

  it("starts the upload on accept and schedules the advance", () => {
    const s = run(
      fresh(),
      { type: "start" },
      { type: "captured", previewUrl: "blob:1" },
      { type: "accepted", uploadId: "u1" },
    );
    expect(s.slots.front).toMatchObject({ status: "uploading", previewUrl: "blob:1", uploadId: "u1" });
    expect(s.draft).toBeNull();
    expect(s.pendingAdvance).toBe("u1");
    expect(s.current).toBe("front");
  });

  it("ignores accept without a draft", () => {
    const start = run(fresh(), { type: "start" });
    expect(run(start, { type: "accepted", uploadId: "u1" })).toBe(start);
  });

  it("advances to the next open slot", () => {
    const s = shoot(run(fresh(), { type: "start" }), 1);
    expect(s.current).toBe("rear");
    expect(s.pendingAdvance).toBeNull();
  });

  it("ignores a stale advance after the worker moved on", () => {
    const s = run(
      fresh(),
      { type: "start" },
      { type: "captured", previewUrl: "blob:1" },
      { type: "accepted", uploadId: "u1" },
      { type: "goToSlot", slot: "attachment" },
      { type: "advance", uploadId: "u1" },
    );
    expect(s.current).toBe("attachment");
  });

  it("wraps around to earlier open slots", () => {
    let s = run(fresh(), { type: "start" }, { type: "goToSlot", slot: "attachment" });
    s = shoot(s, 1);
    expect(s.current).toBe("front");
  });

  it("completes after the sixth photo", () => {
    let s = run(fresh(), { type: "start" });
    for (let i = 0; i < 6; i++) s = shoot(s, i);
    expect(s.step).toBe("complete");
  });

  it("lets the worker reshoot a slot from the strip", () => {
    const s = run(fresh("checkout", allPhotos("c")), { type: "goToSlot", slot: "rear" });
    expect(s.step).toBe("capture");
    expect(s.current).toBe("rear");
  });
});

describe("upload results", () => {
  const uploading = run(
    fresh(),
    { type: "start" },
    { type: "captured", previewUrl: "blob:1" },
    { type: "accepted", uploadId: "u1" },
  );

  it("marks the slot done", () => {
    const s = run(uploading, { type: "uploadSucceeded", slot: "front", uploadId: "u1", photoId: "P1" });
    expect(s.slots.front).toMatchObject({ status: "done", photoId: "P1", error: null });
  });

  it("marks the slot as failed with a message", () => {
    const s = run(uploading, { type: "uploadFailed", slot: "front", uploadId: "u1", error: "nope" });
    expect(s.slots.front).toMatchObject({ status: "error", error: "nope" });
  });

  it("ignores results from a replaced upload", () => {
    const s = run(uploading, { type: "uploadSucceeded", slot: "front", uploadId: "old", photoId: "X" });
    expect(s).toBe(uploading);
  });

  it("retries a failed upload under a new id", () => {
    const s = run(
      uploading,
      { type: "uploadFailed", slot: "front", uploadId: "u1", error: "nope" },
      { type: "uploadRetried", slot: "front", uploadId: "u2" },
    );
    expect(s.slots.front).toMatchObject({ status: "uploading", uploadId: "u2", error: null });
  });

  it("only retries slots that failed", () => {
    expect(run(uploading, { type: "uploadRetried", slot: "front", uploadId: "u2" })).toBe(uploading);
  });

  it("keeps the worker on a slot whose photo can't be read", () => {
    const s = run(
      uploading,
      { type: "processingFailed", slot: "front", uploadId: "u1", reason: "Unreadable" },
      { type: "advance", uploadId: "u1" },
    );
    expect(s.current).toBe("front");
    expect(s.pendingAdvance).toBeNull();
    expect(s.slots.front.retakeReason).toBe("Unreadable");
  });

  it("sends the worker back when a photo can't be read", () => {
    let s = run(fresh(), { type: "start" });
    for (let i = 0; i < 6; i++) s = shoot(s, i);
    s = run(s, { type: "processingFailed", slot: "rear", uploadId: "rear-1", reason: "Unreadable" });
    expect(s.step).toBe("capture");
    expect(s.current).toBe("rear");
    expect(s.slots.rear).toMatchObject({ status: "empty", previewUrl: null, retakeReason: "Unreadable" });
  });
});

describe("damage check (return only)", () => {
  const ready = run(fresh("return", allPhotos("r")), { type: "start" });

  it("is ignored during check-out", () => {
    const done = run(fresh("checkout", allPhotos("c")), { type: "start" });
    expect(run(done, { type: "inspectionStarted", at: 1 })).toBe(done);
  });

  it("shows the wait screen while running", () => {
    const s = run(ready, { type: "inspectionStarted", at: 1000 });
    expect(s.step).toBe("inspecting");
    expect(s.inspection).toMatchObject({ status: "running", startedAt: 1000, error: null });
  });

  it("keeps the wait screen with an error on failure", () => {
    const s = run(ready, { type: "inspectionStarted", at: 1 }, { type: "inspectionFailed", error: "x" });
    expect(s.step).toBe("inspecting");
    expect(s.inspection).toMatchObject({ status: "failed", error: "x" });
  });

  it("goes back to the photos when dismissed", () => {
    const s = run(
      ready,
      { type: "inspectionStarted", at: 1 },
      { type: "inspectionFailed", error: "x" },
      { type: "inspectionDismissed" },
    );
    expect(s.step).toBe("complete");
    expect(s.inspection.status).toBe("idle");
  });

  it("queues only the retake slots for the next round", () => {
    const s = run(
      ready,
      { type: "inspectionStarted", at: 1 },
      {
        type: "retakeRequested",
        requests: [
          { slot: "rear", reason: "Too dark" },
          { slot: "attachment", reason: "Blurry" },
        ],
      },
    );
    expect(s.step).toBe("capture");
    expect(s.queue).toEqual(["rear", "attachment"]);
    expect(s.current).toBe("rear");
    expect(s.slots.rear).toMatchObject({ status: "empty", retakeReason: "Too dark", photoId: null });
    expect(s.slots.front.status).toBe("done");
    expect(s.inspection).toMatchObject({ round: 2, status: "idle" });
  });

  it("completes the retake round after the last retake slot", () => {
    let s = run(
      ready,
      { type: "inspectionStarted", at: 1 },
      { type: "retakeRequested", requests: [{ slot: "rear", reason: "Too dark" }] },
    );
    s = shoot(s, 9);
    expect(s.step).toBe("complete");
    expect(s.slots.rear.retakeReason).toBeNull();
  });

  it("ignores an empty retake request", () => {
    const s = run(ready, { type: "inspectionStarted", at: 1 });
    expect(run(s, { type: "retakeRequested", requests: [] })).toBe(s);
  });
});
