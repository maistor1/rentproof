import path from "node:path";

// The app reads rentals.local.json when it exists, else the rentals.json seed.
export const SEED_FILE = path.join(process.cwd(), "data", "rentals.json");
export const LOCAL_FILE = path.join(process.cwd(), "data", "rentals.local.json");
export const E2E_DIR = path.join(process.cwd(), "e2e", ".data");
export const BACKUP_FILE = path.join(E2E_DIR, "rentals.local.backup.json");
export const PHOTO_FILE = path.join(E2E_DIR, "photo.jpg");

export const SLOTS = ["front", "rear", "left_side", "right_side", "operator_cab", "attachment"] as const;

// R-E2E-OUT: fresh, for check-out. R-E2E-RET: check-out done, for return.
// R-E2E-DONE: returned and inspected, for the evidence page.
export const CHECKOUT_RENTAL = "R-E2E-OUT";
export const RETURN_RENTAL = "R-E2E-RET";
export const DONE_RENTAL = "R-E2E-DONE";

const photoIds = (prefix: string) => Object.fromEntries(SLOTS.map((s) => [s, `${prefix}-${s}`]));

function rental(id: string, checkoutPhotos: Record<string, string>, returnPhotos: Record<string, string> = {}) {
  return {
    id,
    machine: { id: "M-07", name: "Mini excavator (e2e)", model: "CAT 301.7 CR", serialNumber: "E2E0301707" },
    customer: { name: "Nordbau GmbH", email: "site@nordbau.example" },
    status: id === DONE_RENTAL ? "inspected" : "out",
    checkoutAt: "2026-10-10T08:00:00.000Z",
    returnAt: null,
    hourMeterAtCheckout: 1240.5,
    hourMeterAtReturn: id === CHECKOUT_RENTAL ? null : 1278,
    telematics: null,
    photos: { checkout: checkoutPhotos, return: returnPhotos },
  };
}

export const E2E_RENTALS = [
  rental(CHECKOUT_RENTAL, {}),
  rental(RETURN_RENTAL, photoIds("E2E")),
  rental(DONE_RENTAL, photoIds("E2E"), photoIds("E2E-RET")),
];

// The report the return spec ends on (mocked inspect, round 2). Written to the
// app's data folder so the server-rendered report page can read it.
export const REPORT_ID = "RPT-E2E-2";
export const REPORT_FILE = path.join(process.cwd(), "data", "inspections", `${REPORT_ID}.json`);

export const E2E_REPORT = {
  id: REPORT_ID,
  rentalId: RETURN_RENTAL,
  createdAt: "2026-10-10T16:05:00.000Z",
  model: "claude-sonnet-5-5",
  slots: SLOTS.map((slot) => ({
    slot,
    image_quality_ok: true,
    retake_reason: null,
    findings: [],
    ignored_changes: slot === "left_side" ? ["dirt on the left track"] : [],
  })),
  findings: [
    {
      id: "F-E2E-1",
      slot: "front",
      type: "scratch",
      severity: "minor",
      confidence: 0.62,
      location: "front blade, left corner",
      box: { x: 0.2, y: 0.3, w: 0.25, h: 0.2 },
      evidence: "thin bright line not in BEFORE",
      status: "needs_review",
    },
  ],
  retakeSlots: [],
};

// A finished inspection: one auto-flagged scratch (charged) and one rejected
// dent (listed as not charged).
export const DONE_REPORT_ID = "RPT-E2E-DONE";
export const DONE_REPORT_FILE = path.join(process.cwd(), "data", "inspections", `${DONE_REPORT_ID}.json`);

export const DONE_REPORT = {
  ...E2E_REPORT,
  id: DONE_REPORT_ID,
  rentalId: DONE_RENTAL,
  findings: [
    { ...E2E_REPORT.findings[0], id: "F-E2E-A", confidence: 0.9, status: "auto_flagged" },
    { ...E2E_REPORT.findings[0], id: "F-E2E-R", slot: "rear", type: "dent", location: "counterweight", status: "rejected" },
  ],
};
