import type { Box, DamageReport, ReviewedFinding, Slot } from "@/lib/types";

// Pure helpers for the damage report screen (RP-12).

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

// Boxes are approximate fractions of the AFTER image. Clip to the photo and
// drop anything with no area left, so the screen falls back to the text.
export function highlightStyle(box: Box | null): { left: string; top: string; width: string; height: string } | null {
  if (!box) return null;
  const left = clamp(box.x);
  const top = clamp(box.y);
  const width = clamp(box.x + box.w) - left;
  const height = clamp(box.y + box.h) - top;
  if (width <= 0 || height <= 0) return null;
  return { left: pct(left), top: pct(top), width: pct(width), height: pct(height) };
}

// Staff decide the review band; auto_flagged is charged as is. Hidden
// findings (< 0.50) stay in the log only.
export function groupFindings(findings: ReviewedFinding[]): { review: ReviewedFinding[]; flagged: ReviewedFinding[] } {
  return {
    review: findings.filter((f) => f.status === "needs_review" || f.status === "confirmed" || f.status === "rejected"),
    flagged: findings.filter((f) => f.status === "auto_flagged"),
  };
}

export function pendingCount(findings: ReviewedFinding[]): number {
  return findings.filter((f) => f.status === "needs_review").length;
}

export function ignoredChanges(report: DamageReport): { slot: Slot; text: string }[] {
  return report.slots.flatMap((s) => s.ignored_changes.map((text) => ({ slot: s.slot, text })));
}

// Fixed locale so server and client render the same.
export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}
