import type { DamageReport, FindingStatus, ReviewedFinding, SlotReport } from "@/lib/types";

export const AUTO_FLAG_AT = 0.8;
export const REVIEW_AT = 0.5;

export function statusFor(confidence: number): FindingStatus {
  if (confidence >= AUTO_FLAG_AT) return "auto_flagged";
  if (confidence >= REVIEW_AT) return "needs_review";
  return "hidden";
}

// RP-10: ≥0.80 auto-flag, 0.50–0.79 needs review, <0.50 hidden but logged.
// A slot with image_quality_ok false goes to retakeSlots, and its findings are
// hidden: we don't charge from a photo we can't trust.
export function applyRules(
  rentalId: string,
  slots: SlotReport[],
): Omit<DamageReport, "id" | "createdAt" | "model"> {
  const retakeSlots = slots.filter((s) => !s.image_quality_ok).map((s) => s.slot);

  const findings: ReviewedFinding[] = slots.flatMap((s) =>
    s.findings.map((f, i) => ({
      ...f,
      id: `${s.slot}-${i + 1}`,
      slot: s.slot,
      status: s.image_quality_ok ? statusFor(f.confidence) : "hidden",
    })),
  );

  return { rentalId, slots, findings, retakeSlots };
}

// Staff decisions on review-band findings. needs_review undoes a decision.
export const REVIEW_STATUSES = ["confirmed", "rejected", "needs_review"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type ReviewResult =
  | { ok: true; report: DamageReport }
  | { ok: false; reason: "not_found" | "not_reviewable" };

// Only findings that landed in the review band can be confirmed or rejected.
// Auto-flagged and hidden ones are the rules' call, not the reviewer's.
export function reviewFinding(
  report: DamageReport,
  findingId: string,
  status: ReviewStatus,
): ReviewResult {
  const finding = report.findings.find((f) => f.id === findingId);
  if (!finding) return { ok: false, reason: "not_found" };
  if (!(REVIEW_STATUSES as readonly string[]).includes(finding.status)) {
    return { ok: false, reason: "not_reviewable" };
  }
  return {
    ok: true,
    report: {
      ...report,
      findings: report.findings.map((f) => (f.id === findingId ? { ...f, status } : f)),
    },
  };
}
