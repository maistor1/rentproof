import path from "node:path";

// The app reads rentals.local.json when it exists, else the rentals.json seed.
export const SEED_FILE = path.join(process.cwd(), "data", "rentals.json");
export const LOCAL_FILE = path.join(process.cwd(), "data", "rentals.local.json");
export const E2E_DIR = path.join(process.cwd(), "e2e", ".data");
export const BACKUP_FILE = path.join(E2E_DIR, "rentals.local.backup.json");
export const PHOTO_FILE = path.join(E2E_DIR, "photo.jpg");

export const SLOTS = ["front", "rear", "left_side", "right_side", "operator_cab", "attachment"] as const;

// R-E2E-OUT: fresh, for check-out. R-E2E-RET: check-out done, for return.
export const CHECKOUT_RENTAL = "R-E2E-OUT";
export const RETURN_RENTAL = "R-E2E-RET";

function rental(id: string, checkoutPhotos: Record<string, string>) {
  return {
    id,
    machine: { id: "M-07", name: "Mini excavator (e2e)", model: "CAT 301.7 CR", serialNumber: "E2E0301707" },
    customer: { name: "Nordbau GmbH", email: "site@nordbau.example" },
    status: "out",
    checkoutAt: "2026-10-10T08:00:00.000Z",
    returnAt: null,
    hourMeterAtCheckout: 1240.5,
    hourMeterAtReturn: id === RETURN_RENTAL ? 1278 : null,
    telematics: null,
    photos: { checkout: checkoutPhotos, return: {} },
  };
}

export const E2E_RENTALS = [
  rental(CHECKOUT_RENTAL, {}),
  rental(RETURN_RENTAL, Object.fromEntries(SLOTS.map((s) => [s, `E2E-${s}`]))),
];
