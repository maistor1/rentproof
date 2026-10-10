import { isDamageReport } from "@/lib/client/guards";
import { requestJson } from "@/lib/client/http";
import type { Result } from "@/lib/client/result";
import { isSlot } from "@/lib/slots";
import type { DamageReport } from "@/lib/types";

// The route allows 120 s for six parallel vision calls; leave a little slack.
const INSPECT_TIMEOUT_MS = 125_000;

export async function runInspection(rentalId: string, signal?: AbortSignal): Promise<Result<DamageReport>> {
  const result = await requestJson(
    "/api/inspect",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rentalId }) },
    { context: "inspection", timeoutMs: INSPECT_TIMEOUT_MS, parse: (b) => (isDamageReport(b) ? b : null), signal },
  );
  if (result.ok || result.error.status !== 400) return result;
  // 400 { missingSlots } means some photos never reached the server.
  const body = result.error.body as { missingSlots?: unknown } | undefined;
  const missing = Array.isArray(body?.missingSlots) ? body.missingSlots.filter(isSlot) : [];
  return missing.length > 0 ? { ok: false, error: { ...result.error, missingSlots: missing } } : result;
}
