import { HomeView } from "@/components/home/HomeView";
import { sortNewestFirst } from "@/lib/home/nextStep";
import { latestReportId, listRentals } from "@/lib/storage";

// Reads the rental files per request, so it can't be prerendered at build.
export const dynamic = "force-dynamic";

export default async function Home() {
  const rentals = sortNewestFirst(await listRentals());
  const items = await Promise.all(
    rentals.map(async (rental) => ({
      rental,
      reportId: rental.status === "inspected" ? await latestReportId(rental.id) : undefined,
    })),
  );
  return <HomeView items={items} />;
}
