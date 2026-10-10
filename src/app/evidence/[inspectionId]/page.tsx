import { notFound } from "next/navigation";
import { EvidenceView } from "@/components/evidence/EvidenceView";
import { buildInvoice } from "@/lib/pricing";
import { getRental, getReport } from "@/lib/storage";

// Reads the saved report per request; staff reviews change it.
export const dynamic = "force-dynamic";

// RP-13: the customer-facing evidence page. "Download PDF" prints it.
export default async function Page(props: PageProps<"/evidence/[inspectionId]">) {
  const { inspectionId } = await props.params;
  const report = await getReport(inspectionId);
  if (!report) notFound();
  const rental = await getRental(report.rentalId);
  if (!rental) notFound();

  if (report.retakeSlots.length > 0 || report.findings.some((f) => f.status === "needs_review")) {
    return (
      <main className="mx-auto w-full max-w-3xl p-6">
        <h1 className="text-task">Not ready yet</h1>
        <p className="mt-2 text-body text-zinc-700">This inspection is still being reviewed. Check back shortly.</p>
      </main>
    );
  }
  return <EvidenceView report={report} rental={rental} invoice={buildInvoice(rental, report)} />;
}
