import { getRental } from "@/lib/storage";

export async function GET(_req: Request, ctx: RouteContext<"/api/rentals/[rentalId]">) {
  const { rentalId } = await ctx.params;
  const rental = await getRental(rentalId);
  if (!rental) return Response.json({ error: "rental not found" }, { status: 404 });
  return Response.json(rental);
}
