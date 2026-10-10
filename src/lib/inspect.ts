import "server-only";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { compareSlot, VISION_MODEL } from "@/lib/ai/vision";
import { applyRules } from "@/lib/rules";
import { PHOTO_DIR } from "@/lib/storage";
import { SLOTS, type DamageReport, type Rental, type Slot } from "@/lib/types";

// Assumes RP-5 saves each upload as data/photos/<photoId>.jpg. This is the
// only place that knows the layout; swap it once Boris settles it.
export function readPhotoFile(photoId: string): Promise<Buffer> {
  return readFile(path.join(PHOTO_DIR, `${photoId}.jpg`));
}

// Slots without both a check-out and a return photo.
export function missingSlots(rental: Rental): Slot[] {
  return SLOTS.filter((s) => !rental.photos.checkout[s] || !rental.photos.return[s]);
}

export interface InspectDeps {
  loadPhoto?: (photoId: string) => Promise<Buffer>;
  compare?: typeof compareSlot;
}

// RP-6 / RP-10: compare all six slots in parallel and apply the confidence
// rules. The caller checks missingSlots first and saves the result.
export async function inspectRental(
  rental: Rental,
  { loadPhoto = readPhotoFile, compare = compareSlot }: InspectDeps = {},
): Promise<DamageReport> {
  const slots = await Promise.all(
    SLOTS.map(async (slot) => {
      const [before, after] = await Promise.all([
        loadPhoto(rental.photos.checkout[slot]!),
        loadPhoto(rental.photos.return[slot]!),
      ]);
      return compare(slot, before, after);
    }),
  );

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    model: VISION_MODEL,
    ...applyRules(rental.id, slots),
  };
}
