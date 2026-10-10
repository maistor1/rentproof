// Shared JSON contracts (RP-2). Everyone codes against these shapes, not
// against each other's modules. Change them only after telling the team.

export const SLOTS = [
  "front",
  "rear",
  "left_side",
  "right_side",
  "operator_cab",
  "attachment",
] as const;
export type Slot = (typeof SLOTS)[number];

export type Phase = "checkout" | "return";

// ISO 15143-3 (AEMP 2.0) snapshot fields we use. Mocked for the demo.
export interface TelematicsSnapshot {
  EquipmentHeader: {
    OEMName: string;
    Model: string;
    EquipmentID: string;
    SerialNumber: string;
  };
  CumulativeOperatingHours: { datetime: string; Hour: number };
  Location: { datetime: string; Latitude: number; Longitude: number };
}

export interface Rental {
  id: string;
  machine: {
    id: string;
    name: string;
    model: string;
    serialNumber: string;
  };
  customer: { name: string; email: string };
  status: "out" | "returned" | "inspected";
  checkoutAt: string; // ISO date
  returnAt: string | null;
  hourMeterAtCheckout: number;
  hourMeterAtReturn: number | null;
  telematics: TelematicsSnapshot | null;
  // Latest photo id per slot and phase.
  photos: Record<Phase, Partial<Record<Slot, string>>>;
}

export interface Photo {
  id: string;
  rentalId: string;
  slot: Slot;
  phase: Phase;
  path: string; // relative to data/photos
  width: number;
  height: number;
  takenAt: string;
}

export type DamageType =
  | "scratch"
  | "dent"
  | "crack"
  | "bent_or_broken"
  | "missing_part"
  | "leak"
  | "glass_or_light"
  | "other";

export type Severity = "minor" | "moderate" | "severe";

// 0-1 fractions of the AFTER image. Approximate; draw a soft highlight.
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// One finding as the model returns it.
export interface Finding {
  type: DamageType;
  location: string;
  severity: Severity;
  confidence: number;
  box: Box | null;
  evidence: string;
}

// The `report_damage` tool input, one per slot.
export interface SlotReport {
  slot: Slot;
  image_quality_ok: boolean;
  retake_reason: string | null;
  findings: Finding[];
  ignored_changes: string[];
}

// What the decision rules make of a finding (plain code, not the model).
export type FindingStatus =
  | "auto_flagged" // confidence >= 0.80
  | "needs_review" // 0.50-0.79
  | "confirmed" // needs_review, staff tapped confirm
  | "rejected" // needs_review, staff tapped reject
  | "hidden"; // < 0.50, kept for the log only

export interface ReviewedFinding extends Finding {
  id: string;
  slot: Slot;
  status: FindingStatus;
}

export interface DamageReport {
  id: string;
  rentalId: string;
  createdAt: string;
  model: string;
  slots: SlotReport[]; // raw model output, kept for the accuracy log
  findings: ReviewedFinding[];
  retakeSlots: Slot[]; // slots where image_quality_ok was false
}

export interface InvoiceLine {
  findingId: string;
  description: string;
  priceKey: `${DamageType}/${Severity}`;
  amount: number;
  beforePhotoId: string;
  afterPhotoId: string;
}

export interface Invoice {
  reportId: string;
  rentalId: string;
  currency: string;
  lines: InvoiceLine[];
  total: number;
}
