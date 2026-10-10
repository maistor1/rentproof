import "server-only";
import { HttpError } from "@/lib/http";
import { updateRental } from "@/lib/storage";
import { mockSnapshot } from "@/lib/telematics";
import type { Rental } from "@/lib/types";

// Hours the mocked telematics feed reports at return unless the caller says
// otherwise. A real adapter would read them from the OEM's ISO 15143-3 API.
export const DEMO_HOURS_USED = 37.5;

function hours(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new HttpError(400, `${field} must be a non-negative number`);
  }
  return value;
}

// RP-7: closes the rental with the hours from the (mocked) telematics feed.
// Calling it again returns the rental unchanged, so a double tap is harmless.
export async function recordReturn(
  rentalId: string,
  hoursUsed: unknown = DEMO_HOURS_USED,
): Promise<Rental> {
  const used = hours(hoursUsed, "hoursUsed");
  const rental = await updateRental(rentalId, (r) => {
    if (r.status !== "out") return;
    const snapshot = mockSnapshot(r, used);
    r.telematics = snapshot;
    r.hourMeterAtReturn = snapshot.CumulativeOperatingHours.Hour;
    r.returnAt = snapshot.CumulativeOperatingHours.datetime;
    r.status = "returned";
  });
  if (!rental) throw new HttpError(404, "rental not found");
  return rental;
}
