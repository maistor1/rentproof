import { describe, expect, it, vi } from "vitest";
import rentals from "@/test/seed/rentals.json";
import { inspectRental, missingSlots } from "@/lib/inspect";
import { SLOTS, type Rental, type Slot, type SlotReport } from "@/lib/types";

const base = rentals[0] as Rental;

const withPhotos = (slots: readonly Slot[]): Rental => ({
  ...base,
  photos: {
    checkout: Object.fromEntries(slots.map((s) => [s, `co-${s}`])),
    return: Object.fromEntries(slots.map((s) => [s, `rt-${s}`])),
  },
});

const clean = (slot: Slot): SlotReport => ({
  slot,
  image_quality_ok: true,
  retake_reason: null,
  findings: [],
  ignored_changes: [],
});

describe("missingSlots", () => {
  it("lists slots without both photos", () => {
    expect(missingSlots(base)).toEqual([...SLOTS]);
    expect(missingSlots(withPhotos(SLOTS))).toEqual([]);
    expect(missingSlots(withPhotos(["front", "rear"]))).toHaveLength(4);
  });
});

describe("inspectRental", () => {
  it("compares each slot's check-out photo with its return photo", async () => {
    const loadPhoto = async (id: string) => Buffer.from(id);
    const compare = vi.fn(async (slot: Slot) => clean(slot));

    const report = await inspectRental(withPhotos(SLOTS), { loadPhoto, compare });

    expect(compare).toHaveBeenCalledTimes(6);
    for (const slot of SLOTS) {
      expect(compare).toHaveBeenCalledWith(slot, Buffer.from(`co-${slot}`), Buffer.from(`rt-${slot}`));
    }
    expect(report.rentalId).toBe(base.id);
    expect(report.slots.map((s) => s.slot)).toEqual([...SLOTS]);
    expect(report.findings).toEqual([]);
  });

  it("fails the whole inspection if one slot fails", async () => {
    const compare = vi.fn(async (slot: Slot) => {
      if (slot === "attachment") throw new Error("no report_damage call");
      return clean(slot);
    });
    await expect(
      inspectRental(withPhotos(SLOTS), { loadPhoto: async () => Buffer.alloc(0), compare }),
    ).rejects.toThrow("no report_damage call");
  });
});
