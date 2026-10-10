import { describe, expect, it } from "vitest";
import { formatSlotList, isSlot, missingSlots, SLOT_COPY, slotLabel } from "@/lib/slots";
import { SLOTS } from "@/lib/types";

describe("SLOT_COPY", () => {
  it("has a label and a framing hint for every slot", () => {
    for (const slot of SLOTS) {
      expect(SLOT_COPY[slot].label).not.toBe("");
      expect(SLOT_COPY[slot].hint).not.toBe("");
    }
  });

  it("labels slots for people", () => {
    expect(slotLabel("operator_cab")).toBe("Operator cab");
    expect(slotLabel("left_side")).toBe("Left side");
  });
});

describe("isSlot", () => {
  it("accepts known slots only", () => {
    expect(isSlot("front")).toBe(true);
    expect(isSlot("roof")).toBe(false);
    expect(isSlot("../etc")).toBe(false);
    expect(isSlot(3)).toBe(false);
  });
});

describe("missingSlots", () => {
  it("lists slots without a photo in SLOTS order", () => {
    expect(missingSlots({ front: "p1", left_side: "p2" })).toEqual([
      "rear",
      "right_side",
      "operator_cab",
      "attachment",
    ]);
  });

  it("is empty when every slot has a photo", () => {
    const all = Object.fromEntries(SLOTS.map((s) => [s, `id-${s}`]));
    expect(missingSlots(all)).toEqual([]);
  });

  it("treats empty ids as missing", () => {
    expect(missingSlots({ front: "" })).toContain("front");
  });
});

describe("formatSlotList", () => {
  it("joins labels for messages", () => {
    expect(formatSlotList(["rear", "operator_cab"])).toBe("Rear, Operator cab");
    expect(formatSlotList([])).toBe("");
  });
});
