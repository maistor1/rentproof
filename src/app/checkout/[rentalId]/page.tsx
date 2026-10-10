import { notFound } from "next/navigation";
import { BlockedNotice } from "@/components/capture/BlockedNotice";
import { getRental } from "@/lib/storage";
import { CheckoutFlow } from "./CheckoutFlow";

// Reads rentals.json per request, like the home page.
export const dynamic = "force-dynamic";

// RP-4: capture the six check-out photos. The hour meter is data, shown only.
export default async function Page(props: PageProps<"/checkout/[rentalId]">) {
  const { rentalId } = await props.params;
  const rental = await getRental(rentalId);
  if (!rental) notFound();

  if (rental.status !== "out") {
    return (
      <BlockedNotice
        title="Already returned"
        body="This machine is back in the yard, so its check-out photos can't change."
        cta={{ label: "Back to rentals", href: "/" }}
      />
    );
  }
  return <CheckoutFlow rental={rental} />;
}
