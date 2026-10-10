import Link from "next/link";
import { listRentals } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rentals = await listRentals();
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">RentProof</h1>
      <p className="mt-1 text-zinc-500">Damage detection on rental return.</p>
      <ul className="mt-6 divide-y rounded border">
        {rentals.map((r) => (
          <li key={r.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{r.machine.name}</div>
              <div className="text-sm text-zinc-500">
                {r.id} · {r.customer.name} · {r.status}
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <Link className="underline" href={`/checkout/${r.id}`}>Check-out</Link>
              <Link className="underline" href={`/return/${r.id}`}>Return</Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
