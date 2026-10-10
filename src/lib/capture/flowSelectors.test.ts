import { describe, expect, it } from "vitest";
import { captureFlowReducer } from "@/lib/capture/flowReducer";
import {
  acceptedCount,
  completePrimary,
  nextOpenSlot,
  progressSegments,
  referencedPreviewUrls,
  slotTone,
  uploadSummary,
} from "@/lib/capture/flowSelectors";
import type { CaptureFlowState, FlowAction } from "@/lib/capture/flowTypes";
import { createInitialFlowState } from "@/lib/capture/initialState";
import type { Phase, Slot } from "@/lib/types";
import { allPhotos } from "@/test/fixtures";

function state(phase: Phase, saved: Partial<Record<Slot, string>>, ...actions: FlowAction[]) {
  const init = createInitialFlowState({ phase, savedPhotos: saved, toUrl: (id) => `/p/${id}` });
  return actions.reduce(captureFlowReducer, init);
}

function withSlot(s: CaptureFlowState, slot: Slot, patch: Partial<CaptureFlowState["slots"][Slot]>) {
  return { ...s, slots: { ...s.slots, [slot]: { ...s.slots[slot], ...patch } } };
}

describe("slotTone", () => {
  it("marks the slot being shot as current", () => {
    const s = state("checkout", {}, { type: "start" });
    expect(slotTone(s, "front")).toBe("current");
    expect(slotTone(s, "rear")).toBe("empty");
  });

  it("shows upload and saved states", () => {
    const s = state("checkout", { rear: "r" }, { type: "start" });
    expect(slotTone(s, "rear")).toBe("done");
    expect(slotTone(withSlot(s, "attachment", { status: "uploading" }), "attachment")).toBe("uploading");
  });

  it("flags failed uploads and waiting retakes as problems", () => {
    const s = state("return", {}, { type: "start" });
    expect(slotTone(withSlot(s, "rear", { status: "error" }), "rear")).toBe("problem");
    expect(slotTone(withSlot(s, "rear", { retakeReason: "dark" }), "rear")).toBe("problem");
  });

  it("shows a retake slot as current while it is being shot", () => {
    const s = withSlot(state("return", {}, { type: "start" }), "front", { retakeReason: "dark" });
    expect(slotTone(s, "front")).toBe("current");
  });

  it("has no current slot outside the capture step", () => {
    expect(slotTone(state("checkout", {}), "front")).toBe("empty");
  });
});

describe("counts and lists", () => {
  it("counts saved and uploading photos", () => {
    const s = withSlot(state("checkout", { front: "f", rear: "r" }), "attachment", { status: "uploading" });
    expect(acceptedCount(s)).toBe(3);
    expect(progressSegments(s)).toHaveLength(6);
    expect(progressSegments(s)[0]).toEqual({ slot: "front", tone: "done" });
  });

  it("summarises pending and failed uploads", () => {
    let s = state("checkout", allPhotos("c"));
    s = withSlot(withSlot(s, "rear", { status: "uploading" }), "attachment", { status: "error" });
    expect(uploadSummary(s)).toEqual({ pending: ["rear"], failed: ["attachment"] });
  });

  it("finds the next open slot after the current one", () => {
    const s = state("checkout", { rear: "r" }, { type: "start" });
    expect(nextOpenSlot(s)).toBe("left_side");
    expect(nextOpenSlot(state("checkout", allPhotos("c")))).toBeNull();
  });

  it("collects every preview still on screen", () => {
    const s = state("checkout", { front: "f" }, { type: "start" }, { type: "captured", previewUrl: "blob:9" });
    expect(referencedPreviewUrls(s)).toEqual(new Set(["/p/f", "blob:9"]));
  });
});

describe("completePrimary", () => {
  const done = state("checkout", allPhotos("c"), { type: "start" });

  it("retries failed uploads first", () => {
    const s = withSlot(withSlot(done, "rear", { status: "error" }), "front", { status: "error" });
    expect(completePrimary(s)).toEqual({ intent: "retryUploads", label: "Retry 2 uploads", disabled: false });
  });

  it("waits for uploads still running", () => {
    const s = withSlot(done, "rear", { status: "uploading" });
    expect(completePrimary(s)).toEqual({ intent: "wait", label: "Uploading 1 photo…", disabled: true });
  });

  it("finishes check-out", () => {
    expect(completePrimary(done)).toEqual({ intent: "finish", label: "Back to rentals", disabled: false });
  });

  it("starts the damage check on return, and says when it is a re-run", () => {
    const ret = state("return", allPhotos("r"), { type: "start" });
    expect(completePrimary(ret)).toEqual({ intent: "inspect", label: "Run damage check", disabled: false });
    const again = { ...ret, inspection: { ...ret.inspection, round: 2 } };
    expect(completePrimary(again).label).toBe("Run damage check again");
  });

  it("uses singular wording for one failed upload", () => {
    expect(completePrimary(withSlot(done, "rear", { status: "error" })).label).toBe("Retry 1 upload");
  });
});
