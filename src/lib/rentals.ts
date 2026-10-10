import "server-only";
import { HttpError } from "@/lib/http";
import { addRental, newId, updateRental } from "@/lib/storage";
import { mockCheckoutHours, mockSnapshot } from "@/lib/telematics";
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

const MAX_TEXT = 120;

function text(value: unknown, field: string): string {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) throw new HttpError(400, `${field} is required`);
  if (v.length > MAX_TEXT) throw new HttpError(400, `${field} is longer than ${MAX_TEXT} characters`);
  return v;
}

function email(value: unknown, field: string): string {
  const v = text(value, field);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new HttpError(400, `${field} is not an email address`);
  return v;
}

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

// Starts a rental from the "New rental" form: { machine: { name, model,
// serialNumber }, customer: { name, email } }. The check-out hours come from
// the (mocked) telematics feed, never from the form.
export async function createRental(input: unknown): Promise<Rental> {
  const body = record(input);
  const machine = record(body.machine);
  const customer = record(body.customer);
  const serialNumber = text(machine.serialNumber, "machine.serialNumber");
  const rental: Rental = {
    id: newId("R"),
    machine: {
      id: newId("M"),
      name: text(machine.name, "machine.name"),
      model: text(machine.model, "machine.model"),
      serialNumber,
    },
    customer: { name: text(customer.name, "customer.name"), email: email(customer.email, "customer.email") },
    status: "out",
    checkoutAt: new Date().toISOString(),
    returnAt: null,
    hourMeterAtCheckout: mockCheckoutHours(serialNumber),
    hourMeterAtReturn: null,
    telematics: null,
    photos: { checkout: {}, return: {} },
  };
  await addRental(rental);
  return rental;
}
