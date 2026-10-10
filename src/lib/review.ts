import "server-only";
import { HttpError } from "@/lib/http";
import { updateReport } from "@/lib/storage";
import type { DamageReport, FindingStatus } from "@/lib/types";

export type ReviewDecision = "confirmed" | "rejected";

const DECISIONS: readonly string[] = ["confirmed", "rejected"];
// Staff decide only the 0.50-0.79 band. auto_flagged and hidden are set by the
// confidence rules and stay that way.
const REVIEWABLE: readonly FindingStatus[] = ["needs_review", "confirmed", "rejected"];

export async function reviewFinding(
  reportId: string,
  findingId: string,
  decision: unknown,
): Promise<DamageReport> {
  if (typeof decision !== "string" || !DECISIONS.includes(decision)) {
    throw new HttpError(400, "status must be confirmed or rejected");
  }
  const report = await updateReport(reportId, (r) => {
    const finding = r.findings.find((f) => f.id === findingId);
    if (!finding) throw new HttpError(404, "finding not found");
    if (!REVIEWABLE.includes(finding.status)) {
      throw new HttpError(409, `finding is ${finding.status}; only review-band findings can be changed`);
    }
    finding.status = decision as ReviewDecision;
  });
  if (!report) throw new HttpError(404, "report not found");
  return report;
}
