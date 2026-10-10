import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { compareSlot, VISION_MODEL } from "@/lib/ai/vision";
import { applyRules } from "@/lib/rules";
import { getRental, PHOTO_DIR, saveRental, saveReport } from "@/lib/storage";
import { SLOTS, type DamageReport } from "@/lib/types";

// Six vision calls in parallel can take a while.
export const maxDuration = 120;

// Assumes RP-5 saves each upload as data/photos/<photoId>.jpg. Swap for a
// storage helper once Boris settles the layout.
function readPhoto(photoId: string): Promise<Buffer> {
  return readFile(path.join(PHOTO_DIR, `${photoId}.jpg`));
}

// RP-6 / RP-10: body { rentalId }. Runs compareSlot for all six slots in
// parallel, applies the confidence rules, saves and returns a DamageReport.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rentalId = body?.rentalId;
  if (typeof rentalId !== "string") {
    return Response.json({ error: "rentalId is required" }, { status: 400 });
  }

  const rental = await getRental(rentalId);
  if (!rental) {
    return Response.json({ error: `rental ${rentalId} not found` }, { status: 404 });
  }

  const missing = SLOTS.filter((s) => !rental.photos.checkout[s] || !rental.photos.return[s]);
  if (missing.length > 0) {
    return Response.json({ error: "missing photos", missingSlots: missing }, { status: 400 });
  }

  let slots;
  try {
    slots = await Promise.all(
      SLOTS.map(async (slot) => {
        const [before, after] = await Promise.all([
          readPhoto(rental.photos.checkout[slot]!),
          readPhoto(rental.photos.return[slot]!),
        ]);
        return compareSlot(slot, before, after);
      }),
    );
  } catch (err) {
    console.error("inspect failed", err);
    return Response.json({ error: "inspection failed", detail: String(err) }, { status: 502 });
  }

  const report: DamageReport = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    model: VISION_MODEL,
    ...applyRules(rentalId, slots),
  };
  await saveReport(report);
  // A retake means the return screen re-shoots and calls us again.
  if (report.retakeSlots.length === 0) {
    await saveRental({ ...rental, status: "inspected" });
  }

  return Response.json(report);
}
