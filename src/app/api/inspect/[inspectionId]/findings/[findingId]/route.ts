import { errorResponse, jsonError } from "@/lib/http";
import { reviewFinding } from "@/lib/review";

// RP-12 review buttons. Body: { status: "confirmed" | "rejected" }.
// Returns the updated DamageReport.
export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/inspect/[inspectionId]/findings/[findingId]">,
) {
  const { inspectionId, findingId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError(400, "expected a JSON body");
  try {
    return Response.json(await reviewFinding(inspectionId, findingId, body.status));
  } catch (e) {
    return errorResponse(e);
  }
}
