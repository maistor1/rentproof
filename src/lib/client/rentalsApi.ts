import { isRental } from "@/lib/client/guards";
import { requestJson } from "@/lib/client/http";
import type { Result } from "@/lib/client/result";
import type { Rental } from "@/lib/types";

const RETURN_TIMEOUT_MS = 15_000;

// RP-7: closes the rental with hours from the telematics feed. The route is
// safe to repeat, so retries and re-inspections can call it again.
export function recordReturn(rentalId: string, signal?: AbortSignal): Promise<Result<Rental>> {
  return requestJson(
    `/api/rentals/${encodeURIComponent(rentalId)}/return`,
    { method: "POST" },
    { context: "return", timeoutMs: RETURN_TIMEOUT_MS, parse: (b) => (isRental(b) ? b : null), signal },
  );
}
