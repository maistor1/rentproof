import { REVIEW_STATUSES, reviewFinding, type ReviewStatus } from "@/lib/rules";
import { getReport, saveReport } from "@/lib/storage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Review buttons on the damage report: body { status: "confirmed" | "rejected"
// | "needs_review" }. Returns the updated DamageReport.
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/inspect/[reportId]/findings/[findingId]">,
) {
  const { reportId, findingId } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body || !REVIEW_STATUSES.includes(body.status)) {
    return Response.json(
      { error: `status must be one of ${REVIEW_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  // Report ids are UUIDs and end up in a file path, so reject anything else.
  const report = UUID.test(reportId) ? await getReport(reportId) : undefined;
  if (!report) {
    return Response.json({ error: `report ${reportId} not found` }, { status: 404 });
  }

  const result = reviewFinding(report, findingId, body.status as ReviewStatus);
  if (!result.ok) {
    return result.reason === "not_found"
      ? Response.json({ error: `finding ${findingId} not found` }, { status: 404 })
      : Response.json({ error: `finding ${findingId} is not in the review band` }, { status: 409 });
  }

  await saveReport(result.report);
  return Response.json(result.report);
}
