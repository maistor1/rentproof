import type { ReactNode } from "react";
import { PrintButton } from "@/components/evidence/PrintButton";
import { PhotoCompare } from "@/components/report/PhotoCompare";
import { formatHoursUsed, hoursUsed, returnReading } from "@/lib/hourMeter";
import { evidenceItems, findingTitle, formatMoney, notCharged } from "@/lib/report/view";
import { slotLabel } from "@/lib/slots";
import type { DamageReport, Invoice, Rental } from "@/lib/types";

interface EvidenceViewProps {
  report: DamageReport;
  rental: Rental;
  invoice: Invoice;
}

// Rendered on the server only, so the laptop's time zone is the one shown.
const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
const date = (iso: string | null) => (iso ? DATE.format(new Date(iso)) : "not returned");

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-meta text-zinc-700">{label}</dt>
      <dd className="text-body">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-b border-zinc-300 pb-1 text-meta font-semibold tracking-wide text-zinc-700 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

// RP-13: what the customer gets. Each charge with its before/after proof,
// the total, and what we checked and let go. Read-only.
export function EvidenceView({ report, rental, invoice }: EvidenceViewProps) {
  const items = evidenceItems(report, invoice);
  const letGo = notCharged(report);
  const atReturn = returnReading(rental);

  return (
    <main className="capture-surface mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-6 print:max-w-none print:p-0">
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-meta font-semibold tracking-wide text-zinc-700 uppercase">RentProof</p>
            <h1 className="text-task">Damage evidence</h1>
          </div>
          <PrintButton />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 print:grid-cols-3">
          <Fact label="Customer">{rental.customer.name}</Fact>
          <Fact label="Rental">{rental.id}</Fact>
          <Fact label="Machine">
            {rental.machine.name}, {rental.machine.model} · S/N {rental.machine.serialNumber}
          </Fact>
          <Fact label="Checked out">{date(rental.checkoutAt)}</Fact>
          <Fact label="Returned">{date(rental.returnAt)}</Fact>
          {atReturn !== null && (
            <Fact label="Operating hours (telematics)">
              <span className="font-mono">{formatHoursUsed(hoursUsed(rental.hourMeterAtCheckout, atReturn))}</span>
            </Fact>
          )}
        </dl>
        <p className="text-meta text-zinc-700">
          Inspection {report.id} on {date(report.createdAt)}. Each return photo was compared with the photo of the same
          side taken at check-out. Highlights mark the approximate area.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border-2 border-done bg-green-50 p-4">
          <p className="text-body font-semibold text-done-ink">No new damage found</p>
          <p className="text-meta text-zinc-700">All six return photos match the check-out. Nothing is charged.</p>
        </div>
      ) : (
        <Section title="Charged damage">
          {items.map(({ line, finding }) => (
            <article
              key={finding.id}
              data-testid={`evidence-${finding.id}`}
              className="flex break-inside-avoid flex-col gap-2 rounded-xl border border-zinc-300 p-3"
            >
              <header className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-body font-semibold">{findingTitle(finding)}</h3>
                  <p className="text-meta text-zinc-700">
                    {slotLabel(finding.slot)}: {finding.location}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-body font-semibold">
                  {formatMoney(line.amount, invoice.currency)}
                </span>
              </header>
              <PhotoCompare
                beforeId={line.beforePhotoId}
                afterId={line.afterPhotoId}
                label={slotLabel(finding.slot)}
                box={finding.box}
              />
              <p className="text-meta text-zinc-700">
                {finding.evidence} ({Math.round(finding.confidence * 100)}% confidence
                {finding.status === "confirmed" ? ", confirmed by staff" : ""})
              </p>
            </article>
          ))}
          <p className="flex break-inside-avoid justify-between border-t-2 border-zinc-900 pt-2 text-body font-semibold">
            <span>Total</span>
            <span data-testid="evidence-total" className="font-mono">
              {formatMoney(invoice.total, invoice.currency)}
            </span>
          </p>
          <p className="text-meta text-zinc-700">Sample prices for the demo.</p>
        </Section>
      )}

      {letGo.length > 0 && (
        <Section title="Checked and not charged">
          <ul className="flex break-inside-avoid flex-col gap-1 text-body">
            {letGo.map((c, i) => (
              <li key={i}>
                <span className="text-meta text-zinc-700">{slotLabel(c.slot)}: </span>
                {c.text}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </main>
  );
}
