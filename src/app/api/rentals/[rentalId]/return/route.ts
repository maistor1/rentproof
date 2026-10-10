import { errorResponse } from "@/lib/http";
import { recordReturn } from "@/lib/rentals";

// RP-7: closes the rental with hours from the mocked ISO 15143-3 feed. Body is
// optional: { hoursUsed?: number } overrides the demo default. Safe to repeat.
export async function POST(req: Request, ctx: RouteContext<"/api/rentals/[rentalId]/return">) {
  const { rentalId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    return Response.json(await recordReturn(rentalId, body?.hoursUsed ?? undefined));
  } catch (e) {
    return errorResponse(e);
  }
}
