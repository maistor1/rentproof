import { errorResponse, jsonError } from "@/lib/http";
import { buildInvoice } from "@/lib/pricing";
import { getRental, getReport } from "@/lib/storage";

// RP-11: the Invoice for a saved DamageReport.
export async function GET(_req: Request, ctx: RouteContext<"/api/invoice/[inspectionId]">) {
  const { inspectionId } = await ctx.params;
  const report = await getReport(inspectionId);
  if (!report) return jsonError(404, "report not found");
  const rental = await getRental(report.rentalId);
  if (!rental) return jsonError(404, "rental not found");
  try {
    return Response.json(buildInvoice(rental, report));
  } catch (e) {
    return errorResponse(e);
  }
}
