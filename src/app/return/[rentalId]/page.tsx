import { notFound } from "next/navigation";
import { BlockedNotice } from "@/components/capture/BlockedNotice";
import { formatSlotList, missingSlots } from "@/lib/slots";
import { getRental } from "@/lib/storage";
import { ReturnFlow } from "./ReturnFlow";

// Reads the rental files per request, like the home page.
export const dynamic = "force-dynamic";

// RP-9: capture the six return photos against the check-out photos, then run
// the damage check. The hour meter is data, shown only.
export default async function Page(props: PageProps<"/return/[rentalId]">) {
  const { rentalId } = await props.params;
  const rental = await getRental(rentalId);
  if (!rental) notFound();

  const missing = missingSlots(rental.photos.checkout);
  if (missing.length > 0) {
    return (
      <BlockedNotice
        title="Check-out photos missing"
        body={`There's nothing to compare yet for: ${formatSlotList(missing)}. Finish the check-out first.`}
        cta={{ label: "Go to check-out", href: `/checkout/${encodeURIComponent(rental.id)}` }}
      />
    );
  }
  return <ReturnFlow rental={rental} />;
}
