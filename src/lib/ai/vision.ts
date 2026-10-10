import "server-only";
import type { Slot, SlotReport } from "@/lib/types";

export const VISION_MODEL = "claude-sonnet-5-5";

// RP-6 (Member 2): one call per slot, BEFORE and AFTER images, returns the
// report_damage tool input. See README "Notes for the AI owner".
export async function compareSlot(
  slot: Slot,
  beforeJpeg: Buffer,
  afterJpeg: Buffer,
): Promise<SlotReport> {
  void slot;
  void beforeJpeg;
  void afterJpeg;
  throw new Error("compareSlot not implemented yet (RP-6)");
}
