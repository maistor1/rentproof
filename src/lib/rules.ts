import type { DamageReport, SlotReport } from "@/lib/types";

export const AUTO_FLAG_AT = 0.8;
export const REVIEW_AT = 0.5;

// RP-10 (Member 2): apply the confidence table from the plan.
export function applyRules(
  rentalId: string,
  slots: SlotReport[],
): Omit<DamageReport, "id" | "createdAt" | "model"> {
  void rentalId;
  void slots;
  throw new Error("applyRules not implemented yet (RP-10)");
}
