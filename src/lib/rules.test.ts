import { describe, expect, it } from "vitest";
import { applyRules, reviewFinding, statusFor } from "@/lib/rules";
import type { DamageReport, Finding, SlotReport } from "@/lib/types";

const finding = (confidence: number): Finding => ({
  type: "scratch",
  location: "left panel",
  severity: "minor",
  confidence,
  box: null,
  evidence: "new line in AFTER",
});

const slot = (s: SlotReport["slot"], confidences: number[], ok = true): SlotReport => ({
  slot: s,
  image_quality_ok: ok,
  retake_reason: ok ? null : "too dark",
  findings: confidences.map(finding),
  ignored_changes: [],
});

describe("statusFor", () => {
  it("applies the confidence bands at their edges", () => {
    expect(statusFor(0.8)).toBe("auto_flagged");
    expect(statusFor(0.79)).toBe("needs_review");
    expect(statusFor(0.5)).toBe("needs_review");
    expect(statusFor(0.49)).toBe("hidden");
  });
});

describe("applyRules", () => {
  it("gives every finding a stable id and its slot", () => {
    const { findings } = applyRules("R-1", [slot("front", [0.9, 0.6]), slot("rear", [0.3])]);
    expect(findings.map((f) => [f.id, f.slot, f.status])).toEqual([
      ["front-1", "front", "auto_flagged"],
      ["front-2", "front", "needs_review"],
      ["rear-1", "rear", "hidden"],
    ]);
  });

  it("asks for a retake and hides findings from a bad photo", () => {
    const r = applyRules("R-1", [slot("front", [0.95], false), slot("rear", [])]);
    expect(r.retakeSlots).toEqual(["front"]);
    expect(r.findings[0].status).toBe("hidden");
  });

  it("keeps the raw slot reports for the accuracy log", () => {
    const slots = [slot("front", [0.2])];
    expect(applyRules("R-1", slots)).toMatchObject({ rentalId: "R-1", slots });
  });
});

describe("reviewFinding", () => {
  // front-1 auto_flagged, front-2 needs_review, front-3 hidden
  const report: DamageReport = {
    id: "rep",
    createdAt: "2026-10-10T00:00:00.000Z",
    model: "test",
    ...applyRules("R-1", [slot("front", [0.9, 0.6, 0.2])]),
  };

  it("confirms, rejects and undoes a review-band finding", () => {
    for (const status of ["confirmed", "rejected", "needs_review"] as const) {
      const r = reviewFinding(report, "front-2", status);
      expect(r.ok && r.report.findings[1].status).toBe(status);
    }
  });

  it("does not change the stored report in place", () => {
    reviewFinding(report, "front-2", "confirmed");
    expect(report.findings[1].status).toBe("needs_review");
  });

  it("refuses findings outside the review band and unknown ids", () => {
    expect(reviewFinding(report, "front-1", "rejected")).toEqual({ ok: false, reason: "not_reviewable" });
    expect(reviewFinding(report, "front-3", "confirmed")).toEqual({ ok: false, reason: "not_reviewable" });
    expect(reviewFinding(report, "rear-9", "confirmed")).toEqual({ ok: false, reason: "not_found" });
  });
});
