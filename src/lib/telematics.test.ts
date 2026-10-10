import { describe, expect, it } from "vitest";
import rentals from "@/test/seed/rentals.json";
import { mockCheckoutHours, mockSnapshot } from "@/lib/telematics";
import type { Rental } from "@/lib/types";

const rental = rentals[0] as Rental;

describe("mockSnapshot", () => {
  it("adds hours used to the check-out hour meter", () => {
    const snap = mockSnapshot(rental, 37.5);
    expect(snap.CumulativeOperatingHours.Hour).toBe(rental.hourMeterAtCheckout + 37.5);
  });

  it("identifies the machine the way ISO 15143-3 does", () => {
    const snap = mockSnapshot(rental, 0);
    expect(snap.EquipmentHeader).toEqual({
      OEMName: "CAT",
      Model: rental.machine.model,
      EquipmentID: rental.machine.id,
      SerialNumber: rental.machine.serialNumber,
    });
  });
});

describe("mockCheckoutHours", () => {
  it("gives the same reading for the same serial", () => {
    expect(mockCheckoutHours("ABC123")).toBe(mockCheckoutHours("ABC123"));
  });

  it("reads a plausible used-machine hour meter with one decimal", () => {
    for (const serial of ["ABC123", "DEMO0301707", "x"]) {
      const h = mockCheckoutHours(serial);
      expect(h).toBeGreaterThanOrEqual(200);
      expect(h).toBeLessThan(3000);
      expect(Math.round(h * 10) / 10).toBe(h);
    }
  });
});
