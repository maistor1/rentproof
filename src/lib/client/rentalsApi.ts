import { isRental } from "@/lib/client/guards";
import { requestJson } from "@/lib/client/http";
import type { Result } from "@/lib/client/result";
import type { Rental } from "@/lib/types";

const RETURN_TIMEOUT_MS = 15_000;
const CREATE_TIMEOUT_MS = 15_000;

export interface NewRental {
  machine: { name: string; model: string; serialNumber: string };
  customer: { name: string; email: string };
}

// RP-7: closes the rental with hours from the telematics feed. The route is
// safe to repeat, so retries and re-inspections can call it again.
export function recordReturn(rentalId: string, signal?: AbortSignal): Promise<Result<Rental>> {
  return requestJson(
    `/api/rentals/${encodeURIComponent(rentalId)}/return`,
    { method: "POST" },
    { context: "return", timeoutMs: RETURN_TIMEOUT_MS, parse: (b) => (isRental(b) ? b : null), signal },
  );
}

// "New rental" form. The server reads the check-out hours from telematics.
export function createRental(input: NewRental, signal?: AbortSignal): Promise<Result<Rental>> {
  return requestJson(
    "/api/rentals",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
    { context: "createRental", timeoutMs: CREATE_TIMEOUT_MS, parse: (b) => (isRental(b) ? b : null), signal },
  );
}
