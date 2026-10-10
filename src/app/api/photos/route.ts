import { errorResponse, jsonError } from "@/lib/http";
import { MAX_UPLOAD_BYTES, savePhoto } from "@/lib/photos";
import { SLOTS, type Phase, type Slot } from "@/lib/types";

const PHASES: readonly Phase[] = ["checkout", "return"];

// RP-5: multipart form with rentalId, slot, phase, file. Returns the Photo.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return jsonError(400, "expected multipart form data");

  const rentalId = form.get("rentalId");
  const slot = form.get("slot");
  const phase = form.get("phase");
  const file = form.get("file");
  if (typeof rentalId !== "string" || !rentalId) return jsonError(400, "rentalId required");
  if (typeof slot !== "string" || !SLOTS.includes(slot as Slot)) {
    return jsonError(400, `slot must be one of: ${SLOTS.join(", ")}`);
  }
  if (typeof phase !== "string" || !PHASES.includes(phase as Phase)) {
    return jsonError(400, "phase must be checkout or return");
  }
  if (!(file instanceof File) || file.size === 0) return jsonError(400, "file required");
  if (file.size > MAX_UPLOAD_BYTES) return jsonError(413, "file too large (max 25 MB)");

  try {
    const photo = await savePhoto({
      rentalId,
      slot: slot as Slot,
      phase: phase as Phase,
      file: Buffer.from(await file.arrayBuffer()),
    });
    return Response.json(photo);
  } catch (e) {
    return errorResponse(e);
  }
}
