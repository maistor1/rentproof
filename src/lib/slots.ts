import { SLOTS, type Slot } from "@/lib/types";

export interface SlotCopy {
  label: string;
  hint: string; // one line, read at a glance while holding the phone
}

export const SLOT_COPY: Readonly<Record<Slot, SlotCopy>> = {
  front: { label: "Front", hint: "Stand 3 m in front. Whole machine in frame." },
  rear: { label: "Rear", hint: "Stand 3 m behind. Counterweight and tracks in frame." },
  left_side: { label: "Left side", hint: "Step back until both track ends fit." },
  right_side: { label: "Right side", hint: "Step back until both track ends fit." },
  operator_cab: { label: "Operator cab", hint: "Through the open door. Seat and controls visible." },
  attachment: { label: "Attachment", hint: "Bucket or tool fills the frame, teeth visible." },
};

export function slotLabel(slot: Slot): string {
  return SLOT_COPY[slot].label;
}

export function isSlot(value: unknown): value is Slot {
  return typeof value === "string" && (SLOTS as readonly string[]).includes(value);
}

export function missingSlots(photos: Partial<Record<Slot, string>>): Slot[] {
  return SLOTS.filter((slot) => !photos[slot]);
}

export function formatSlotList(slots: readonly Slot[]): string {
  return slots.map(slotLabel).join(", ");
}
