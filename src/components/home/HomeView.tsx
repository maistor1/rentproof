import Link from "next/link";
import { CaptureShell } from "@/components/capture/CaptureShell";
import { nextStep } from "@/lib/home/nextStep";
import type { Rental } from "@/lib/types";

export interface HomeItem {
  rental: Rental;
  reportId?: string;
}

// Card actions stay neutral: the yellow "New rental" in the footer is the one
// accent on this screen.
const STEP_CLASS =
  "flex h-12 w-full items-center justify-center rounded-xl border-2 border-zinc-900 px-4 text-body font-semibold " +
  "active:bg-zinc-100 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black";

function RentalCard({ rental, reportId }: HomeItem) {
  const step = nextStep(rental, reportId);
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-body font-semibold">{rental.machine.name}</h2>
          <p className="truncate text-body text-zinc-700">{rental.customer.name}</p>
          <p className="truncate text-meta text-zinc-600">
            {rental.machine.model} · S/N {rental.machine.serialNumber} · {rental.id}
          </p>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-meta font-medium ${
            step.status.done ? "border-done text-done-ink" : "border-zinc-300 text-zinc-700"
          }`}
        >
          <span aria-hidden className={`size-2 rounded-full ${step.status.done ? "bg-done" : "bg-zinc-400"}`} />
          {step.status.label}
        </span>
      </div>
      <Link href={step.primary.href} className={STEP_CLASS}>
        {step.primary.label}
      </Link>
      {step.secondary && (
        <Link
          href={step.secondary.href}
          className="self-center text-body text-zinc-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-black"
        >
          {step.secondary.label}
        </Link>
      )}
    </li>
  );
}

export function HomeView({ items }: { items: HomeItem[] }) {
  return (
    <CaptureShell
      title="Rentals"
      meta="Photos at check-out and return. The damage check compares them."
      primary={{ label: "New rental", href: "/rentals/new" }}
    >
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-body text-zinc-700">
          No rentals yet. Create one to take the check-out photos.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <RentalCard key={item.rental.id} {...item} />
          ))}
        </ul>
      )}
    </CaptureShell>
  );
}
