import { notFound } from "next/navigation";
import { BlockedNotice } from "@/components/capture/BlockedNotice";
import { buildInvoice } from "@/lib/pricing";
import { formatSlotList } from "@/lib/slots";
import { getRental, getReport } from "@/lib/storage";
import type { Invoice } from "@/lib/types";
import { ReportView } from "./ReportView";

// Reads the saved report per request; reviews change it.
export const dynamic = "force-dynamic";

// RP-12: the damage report the return screen opens after a clean inspection.
export default async function Page(props: PageProps<"/report/[inspectionId]">) {
  const { inspectionId } = await props.params;
  const report = await getReport(inspectionId);
  if (!report) notFound();
  const rental = await getRental(report.rentalId);
  if (!rental) notFound();

  if (report.retakeSlots.length > 0) {
    return (
      <BlockedNotice
        title="Retake needed"
        body={`This check couldn't read: ${formatSlotList(report.retakeSlots)}. Retake those photos to get a report.`}
        cta={{ label: "Back to the return", href: `/return/${encodeURIComponent(rental.id)}` }}
      />
    );
  }

  let invoice: Invoice | null = null;
  try {
    invoice = buildInvoice(rental, report);
  } catch (e) {
    console.error("invoice failed", e);
  }
  return <ReportView report={report} rental={rental} invoice={invoice} />;
}
