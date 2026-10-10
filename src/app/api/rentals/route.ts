import { errorResponse, jsonError } from "@/lib/http";
import { createRental } from "@/lib/rentals";
import { listRentals } from "@/lib/storage";

export async function GET() {
  return Response.json(await listRentals());
}

// "New rental" form: { machine: { name, model, serialNumber }, customer:
// { name, email } }. Check-out hours come from telematics, not the body.
export async function POST(req: Request) {
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return jsonError(400, "body must be JSON");
  try {
    return Response.json(await createRental(body), { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
