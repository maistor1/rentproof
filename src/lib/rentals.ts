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

// RP-7: records the return hours from the (mocked) telematics feed. Once the
// hours are recorded, calling it again changes nothing, so a double tap is
// harmless. Status moves out -> returned only; a rental already marked
// inspected keeps that status but still gets its hours.
export async function recordReturn(
  rentalId: string,
  hoursUsed: unknown = DEMO_HOURS_USED,
): Promise<Rental> {
  const used = hours(hoursUsed, "hoursUsed");
  const rental = await updateRental(rentalId, (r) => {
    if (r.hourMeterAtReturn !== null) return;
    const snapshot = mockSnapshot(r, used);
    r.telematics = snapshot;
    r.hourMeterAtReturn = snapshot.CumulativeOperatingHours.Hour;
    r.returnAt = snapshot.CumulativeOperatingHours.datetime;
    if (r.status === "out") r.status = "returned";
  });
  if (!rental) throw new HttpError(404, "rental not found");
  return rental;
}
