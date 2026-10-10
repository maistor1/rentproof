import { SLOTS, type DamageReport, type Rental, type ReviewedFinding, type Slot } from "@/lib/types";

// R-1001 after a return, with a photo id for every slot and phase.
export function sampleRental(): Rental {
  const photos: Rental["photos"] = { checkout: {}, return: {} };
  for (const slot of SLOTS) {
    photos.checkout[slot] = `P-before-${slot}`;
    photos.return[slot] = `P-after-${slot}`;
  }
  return {
    id: "R-1001",
    machine: {
      id: "M-07",
      name: "Mini excavator (demo object)",
      model: "CAT 301.7 CR",
      serialNumber: "DEMO0301707",
    },
    customer: { name: "Nordbau GmbH", email: "site@nordbau.example" },
    status: "returned",
    checkoutAt: "2026-10-10T08:00:00.000Z",
    returnAt: "2026-10-10T16:00:00.000Z",
    hourMeterAtCheckout: 1240.5,
    hourMeterAtReturn: 1278,
    telematics: null,
    photos,
  };
}

function finding(id: string, over: Partial<ReviewedFinding>): ReviewedFinding {
  return {
    id,
    slot: "left_side",
    type: "scratch",
    severity: "minor",
    confidence: 0.9,
    location: "lower edge of the left door",
    box: null,
    evidence: "new scratch in AFTER",
    status: "auto_flagged",
    ...over,
  };
}

// One finding in every status. Billable: F-auto (scratch/minor, 45) and
// F-confirmed (crack/severe, 950), total 995.
export function sampleReport(): DamageReport {
  return {
    id: "I-test",
    rentalId: "R-1001",
    createdAt: "2026-10-10T16:05:00.000Z",
    model: "claude-sonnet-5-5",
    slots: [],
    retakeSlots: [],
    findings: [
      finding("F-auto", { status: "auto_flagged" }),
      finding("F-review", { status: "needs_review", type: "dent", severity: "moderate", slot: "front", confidence: 0.6 }),
      finding("F-confirmed", { status: "confirmed", type: "crack", severity: "severe", slot: "rear", confidence: 0.7 }),
      finding("F-rejected", { status: "rejected", type: "dent", severity: "minor", slot: "rear", confidence: 0.55 }),
      finding("F-hidden", { status: "hidden", type: "other", severity: "minor", slot: "attachment", confidence: 0.3 }),
    ],
  };
}

// Capture screens (Daniel): fresh rentals, reports and frozen state.

export function makeRental(overrides: Partial<Rental> = {}): Rental {
  return {
    id: "R-1001",
    machine: {
      id: "M-07",
      name: "Mini excavator (demo object)",
      model: "CAT 301.7 CR",
      serialNumber: "DEMO0301707",
    },
    customer: { name: "Nordbau GmbH", email: "site@nordbau.example" },
    status: "out",
    checkoutAt: "2026-10-10T08:00:00.000Z",
    returnAt: null,
    hourMeterAtCheckout: 1240.5,
    hourMeterAtReturn: null,
    telematics: null,
    photos: { checkout: {}, return: {} },
    ...overrides,
  };
}

export function allPhotos(prefix: string): Partial<Record<Slot, string>> {
  return Object.fromEntries(SLOTS.map((s) => [s, `${prefix}-${s}`]));
}

export function makeReport(overrides: Partial<DamageReport> = {}): DamageReport {
  return {
    id: "RPT-1",
    rentalId: "R-1001",
    createdAt: "2026-10-10T12:00:00.000Z",
    model: "claude-sonnet-5-5",
    slots: SLOTS.map((slot) => ({
      slot,
      image_quality_ok: true,
      retake_reason: null,
      findings: [],
      ignored_changes: [],
    })),
    findings: [],
    retakeSlots: [],
    ...overrides,
  };
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}
