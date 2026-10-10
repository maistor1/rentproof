import { isDamageReport, isInvoice } from "@/lib/client/guards";
import { requestJson } from "@/lib/client/http";
import type { Result } from "@/lib/client/result";
import type { DamageReport, Invoice } from "@/lib/types";

// needs_review undoes an earlier decision.
export type ReviewDecision = "confirmed" | "rejected" | "needs_review";

const TIMEOUT_MS = 15_000;

export function reviewFinding(
  inspectionId: string,
  findingId: string,
  status: ReviewDecision,
): Promise<Result<DamageReport>> {
  return requestJson(
    `/api/inspect/${encodeURIComponent(inspectionId)}/findings/${encodeURIComponent(findingId)}`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) },
    { context: "review", timeoutMs: TIMEOUT_MS, parse: (b) => (isDamageReport(b) ? b : null) },
  );
}

export function fetchInvoice(inspectionId: string): Promise<Result<Invoice>> {
  return requestJson(
    `/api/invoice/${encodeURIComponent(inspectionId)}`,
    { method: "GET" },
    { context: "review", timeoutMs: TIMEOUT_MS, parse: (b) => (isInvoice(b) ? b : null) },
  );
}
