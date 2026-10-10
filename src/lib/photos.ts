import "server-only";
import sharp from "sharp";
import { HttpError } from "@/lib/http";
import { getRental, newId, updateRental, writePhoto } from "@/lib/storage";
import type { Phase, Photo, Slot } from "@/lib/types";

export const MAX_EDGE = 1500;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// Turns the photo upright from its EXIF orientation (phones store rotation
// there), fits the long edge to 1,500 px and re-encodes as JPEG. sharp drops
// EXIF on output, which also removes the phone's GPS position. Anything sharp
// can't decode, including iPhone HEIC with the prebuilt binary, is a 415.
export async function normalizePhoto(input: Buffer) {
  try {
    const { data, info } = await sharp(input)
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    return { jpeg: data, width: info.width, height: info.height };
  } catch {
    throw new HttpError(415, "unsupported image; send a JPEG or PNG photo");
  }
}

// RP-5: stores the photo and points the rental's slot at it. A retake gets a
// new id; the old file stays on disk for the log.
export async function savePhoto(input: {
  rentalId: string;
  slot: Slot;
  phase: Phase;
  file: Buffer;
}): Promise<Photo> {
  const { rentalId, slot, phase } = input;
  if (!(await getRental(rentalId))) throw new HttpError(404, "rental not found");

  const { jpeg, width, height } = await normalizePhoto(input.file);
  const id = newId("P");
  const photo: Photo = {
    id,
    rentalId,
    slot,
    phase,
    path: `${id}.jpg`,
    width,
    height,
    takenAt: new Date().toISOString(),
  };
  await writePhoto(photo, jpeg);
  await updateRental(rentalId, (r) => {
    r.photos[phase][slot] = id;
  });
  return photo;
}
