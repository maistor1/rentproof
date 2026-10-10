// Phone photos are 3–12 MB; anything far beyond that is not a camera shot.
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

// Returns a message for the worker, or null when the file looks usable.
export function photoFileProblem(file: { type: string; size: number }): string | null {
  // Some Android galleries send no type; let the decoder decide.
  if (file.type && !file.type.startsWith("image/")) return "That file isn't a photo. Take it again with the camera.";
  if (file.size === 0) return "The photo came through empty. Take it again.";
  if (file.size > MAX_PHOTO_BYTES) return "That photo is too large. Take it again with the camera.";
  return null;
}
