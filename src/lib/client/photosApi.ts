import { isPhoto } from "@/lib/client/guards";
import { requestJson } from "@/lib/client/http";
import type { Result } from "@/lib/client/result";
import type { Phase, Photo, Slot } from "@/lib/types";

const UPLOAD_TIMEOUT_MS = 30_000;

export interface UploadInput {
  rentalId: string;
  slot: Slot;
  phase: Phase;
  file: Blob;
  signal?: AbortSignal;
}

export function uploadPhoto({ rentalId, slot, phase, file, signal }: UploadInput): Promise<Result<Photo>> {
  const form = new FormData();
  form.append("rentalId", rentalId);
  form.append("slot", slot);
  form.append("phase", phase);
  form.append("file", file, `${slot}.jpg`);
  return requestJson(
    "/api/photos",
    { method: "POST", body: form },
    { context: "photoUpload", timeoutMs: UPLOAD_TIMEOUT_MS, parse: (b) => (isPhoto(b) ? b : null), signal },
  );
}
