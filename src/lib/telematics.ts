import type { Rental, TelematicsSnapshot } from "@/lib/types";

// RP-7: stand-in for an ISO 15143-3 fleet snapshot. A real adapter would fetch
// this from the OEM / Trackunit API with the fleet owner's credentials.
export function mockSnapshot(rental: Rental, hoursUsed: number): TelematicsSnapshot {
  const now = new Date().toISOString();
  return {
    EquipmentHeader: {
      OEMName: rental.machine.model.split(" ")[0],
      Model: rental.machine.model,
      EquipmentID: rental.machine.id,
      SerialNumber: rental.machine.serialNumber,
    },
    CumulativeOperatingHours: {
      datetime: now,
      Hour: rental.hourMeterAtCheckout + hoursUsed,
    },
    Location: { datetime: now, Latitude: 52.52, Longitude: 13.405 },
  };
}
