import { describe, expect, it } from "vitest";
import { decideInspectionOutcome, MAX_INSPECTION_ROUNDS, RETAKE_FALLBACK } from "@/lib/capture/inspectionOutcome";
import { makeReport } from "@/test/fixtures";

describe("decideInspectionOutcome", () => {
  it("opens the report when no slot needs a retake", () => {
    expect(decideInspectionOutcome(makeReport({ id: "RPT-9" }), 1)).toEqual({ kind: "report", reportId: "RPT-9" });
  });

  it("asks for retakes with the model's reason", () => {
    const base = makeReport();
    const report = makeReport({
      retakeSlots: ["rear"],
      slots: base.slots.map((s) =>
        s.slot === "rear" ? { ...s, image_quality_ok: false, retake_reason: "Too dark to compare" } : s,
      ),
    });
    expect(decideInspectionOutcome(report, 1)).toEqual({
      kind: "retake",
      requests: [{ slot: "rear", reason: "Too dark to compare" }],
    });
  });

  it("falls back to a generic reason", () => {
    const report = makeReport({ retakeSlots: ["front"] });
    expect(decideInspectionOutcome(report, 1)).toEqual({
      kind: "retake",
      requests: [{ slot: "front", reason: RETAKE_FALLBACK }],
    });
  });

  it("stops asking after the last round", () => {
    const report = makeReport({ id: "RPT-3", retakeSlots: ["front"] });
    expect(decideInspectionOutcome(report, MAX_INSPECTION_ROUNDS)).toEqual({ kind: "report", reportId: "RPT-3" });
  });
});
