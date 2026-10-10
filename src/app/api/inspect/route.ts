import { inspectRental, missingSlots } from "@/lib/inspect";
import { getRental, saveReport, updateRental } from "@/lib/storage";

// Six vision calls in parallel can take a while.
export const maxDuration = 120;

// RP-6 / RP-10: body { rentalId }. Runs compareSlot for all six slots in
// parallel, applies the confidence rules, saves and returns a DamageReport.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.rentalId !== "string") {
    return Response.json({ error: "rentalId required" }, { status: 400 });
  }

  const rental = await getRental(body.rentalId);
  if (!rental) {
    return Response.json({ error: `rental ${body.rentalId} not found` }, { status: 404 });
  }

  const missing = missingSlots(rental);
  if (missing.length > 0) {
    return Response.json(
      { error: `missing photos: ${missing.join(", ")}`, missingSlots: missing },
      { status: 400 },
    );
  }

  let report;
  try {
    report = await inspectRental(rental);
  } catch (err) {
    console.error("inspect failed", err);
    return Response.json({ error: `inspection failed: ${String(err)}` }, { status: 502 });
  }

  await saveReport(report);
  // A retake means the return screen re-shoots and calls us again. Update in
  // place: `rental` was read before the vision calls and may be stale.
  if (report.retakeSlots.length === 0) {
    await updateRental(rental.id, (r) => {
      r.status = "inspected";
    });
  }

  return Response.json(report);
}
