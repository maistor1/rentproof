import { describe, expect, it } from "vitest";
import {
  evidenceItems,
  findingTitle,
  formatMoney,
  groupFindings,
  highlightStyle,
  ignoredChanges,
  notCharged,
  pendingCount,
} from "@/lib/report/view";
import { makeReport, sampleReport } from "@/test/fixtures";

describe("highlightStyle", () => {
  it("turns a box into percentage offsets", () => {
    expect(highlightStyle({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 })).toEqual({
      left: "10%",
      top: "20%",
      width: "30%",
      height: "40%",
    });
  });

  it("clamps boxes that spill over the edges", () => {
    expect(highlightStyle({ x: -0.1, y: 0.8, w: 0.5, h: 0.5 })).toEqual({
      left: "0%",
      top: "80%",
      width: "40%",
      height: "20%",
    });
  });

  it("returns null without a usable box", () => {
    expect(highlightStyle(null)).toBeNull();
    expect(highlightStyle({ x: 0.5, y: 0.5, w: 0, h: 0.2 })).toBeNull();
    expect(highlightStyle({ x: 1.2, y: 0, w: 0.3, h: 0.3 })).toBeNull();
  });
});

describe("groupFindings", () => {
  it("splits reviewable from auto-flagged and drops hidden ones", () => {
    const { review, flagged } = groupFindings(sampleReport().findings);
    expect(review.map((f) => f.id)).toEqual(["F-review", "F-confirmed", "F-rejected"]);
    expect(flagged.map((f) => f.id)).toEqual(["F-auto"]);
  });
});

describe("pendingCount", () => {
  it("counts findings still waiting for staff", () => {
    expect(pendingCount(sampleReport().findings)).toBe(1);
  });
});

describe("ignoredChanges", () => {
  it("lists what the model ignored, per slot", () => {
    const report = makeReport();
    report.slots[2].ignored_changes = ["dirt on the left track", "wet patch"];
    expect(ignoredChanges(report)).toEqual([
      { slot: "left_side", text: "dirt on the left track" },
      { slot: "left_side", text: "wet patch" },
    ]);
  });
});

describe("formatMoney", () => {
  it("formats with the currency symbol", () => {
    expect(formatMoney(995, "EUR")).toBe("€995.00");
  });
});

describe("findingTitle", () => {
  it("reads like a sentence", () => {
    expect(findingTitle({ ...sampleReport().findings[0], type: "bent_or_broken", severity: "severe" })).toBe(
      "Bent or broken (severe)",
    );
  });
});

describe("evidenceItems", () => {
  it("pairs each invoice line with its finding, in invoice order", () => {
    const report = sampleReport();
    const lines = ["F-confirmed", "F-auto"].map((findingId) => ({
      findingId,
      description: "",
      priceKey: "scratch/minor" as const,
      amount: 1,
      beforePhotoId: "B",
      afterPhotoId: "A",
    }));
    const invoice = { reportId: report.id, rentalId: "R-1001", currency: "EUR", lines, total: 2 };
    expect(evidenceItems(report, invoice).map((i) => i.finding.id)).toEqual(["F-confirmed", "F-auto"]);
  });
});

describe("notCharged", () => {
  it("lists rejected findings and ignored changes, never hidden ones", () => {
    const report = sampleReport();
    report.slots = makeReport().slots;
    report.slots[0].ignored_changes = ["mud on the blade"];
    expect(notCharged(report)).toEqual([
      { slot: "rear", text: "Dent (minor): lower edge of the left door. Staff decided not to charge." },
      { slot: "front", text: "mud on the blade" },
    ]);
  });
});
