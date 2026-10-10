import { describe, expect, it } from "vitest";
import rentals from "../../data/rentals.json";
import { mockSnapshot } from "@/lib/telematics";
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
