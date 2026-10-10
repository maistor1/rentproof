import { listRentals } from "@/lib/storage";

export async function GET() {
  return Response.json(await listRentals());
}
