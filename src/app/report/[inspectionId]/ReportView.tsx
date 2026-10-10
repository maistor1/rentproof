"use client";

import { useState, type ReactNode } from "react";
import { CaptureShell } from "@/components/capture/CaptureShell";
import { FindingCard } from "@/components/report/FindingCard";
import { InvoiceSummary } from "@/components/report/InvoiceSummary";
import { fetchInvoice, reviewFinding, type ReviewDecision } from "@/lib/client/reviewApi";
import { formatHoursUsed, hoursUsed, returnReading } from "@/lib/hourMeter";
import { groupFindings, ignoredChanges, pendingCount } from "@/lib/report/view";
import { slotLabel } from "@/lib/slots";
import type { DamageReport, Invoice, Rental, ReviewedFinding } from "@/lib/types";

interface ReportViewProps {
  report: DamageReport;
  rental: Rental;
  invoice: Invoice | null;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-meta font-semibold tracking-wide text-zinc-700 uppercase">{title}</h2>
      {children}
    </section>
  );
}

function primaryLabel(pending: number): string {
  return `Review ${pending} finding${pending === 1 ? "" : "s"} first`;
}

// RP-12: staff decide the uncertain findings, the invoice follows each
// decision, and the customer evidence page is the one way forward.
export function ReportView({ report: initialReport, rental, invoice: initialInvoice }: ReportViewProps) {
  const [report, setReport] = useState(initialReport);
  const [invoice, setInvoice] = useState(initialInvoice);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const decide = async (finding: ReviewedFinding, status: ReviewDecision) => {
    setBusyId(finding.id);
    setErrors((e) => {
      const rest = { ...e };
      delete rest[finding.id];
      return rest;
    });
    try {
      const result = await reviewFinding(report.id, finding.id, status);
      if (!result.ok) {
        setErrors((e) => ({ ...e, [finding.id]: result.error.message }));
        return;
      }
      setReport(result.value);
      const next = await fetchInvoice(report.id);
      if (next.ok) {
        setInvoice(next.value);
        setInvoiceError(null);
      } else {
        setInvoiceError("Couldn't update the total. Reload to see the latest.");
      }
    } finally {
      setBusyId(null);
    }
  };

  const { review, flagged } = groupFindings(report.findings);
  const pending = pendingCount(report.findings);
  const ignored = ignoredChanges(report);
  const atReturn = returnReading(rental);
  const card = (f: ReviewedFinding, reviewable: boolean) => (
    <FindingCard
      key={f.id}
      finding={f}
      beforeId={rental.photos.checkout[f.slot]}
      afterId={rental.photos.return[f.slot]}
      busy={busyId === f.id}
      error={errors[f.id] ?? null}
      onDecide={reviewable ? (status) => void decide(f, status) : undefined}
    />
  );

  return (
    <CaptureShell
      header={
        <p className="text-meta text-zinc-700">
          {rental.machine.name} · {rental.customer.name} · {rental.id}
        </p>
      }
      title="Damage report"
      meta={
        atReturn !== null && (
          <span className="font-mono text-done-ink">{formatHoursUsed(hoursUsed(rental.hourMeterAtCheckout, atReturn))}</span>
        )
      }
      primary={
        pending > 0
          ? { label: primaryLabel(pending), disabled: true }
          : { label: "Open customer evidence", href: `/evidence/${encodeURIComponent(report.id)}`, disabled: busyId !== null }
      }
    >
      {review.length + flagged.length === 0 && (
        <div className="rounded-xl border-2 border-done bg-green-50 p-3">
          <p className="text-body font-semibold text-done-ink">No new damage</p>
          <p className="text-meta text-zinc-700">All six return photos match the check-out.</p>
        </div>
      )}
      {review.length > 0 && <Section title="Needs your review">{review.map((f) => card(f, true))}</Section>}
      {flagged.length > 0 && <Section title="New damage">{flagged.map((f) => card(f, false))}</Section>}
      {ignored.length > 0 && (
        <Section title="Ignored, not damage">
          <ul className="flex flex-col gap-1 text-body">
            {ignored.map((c, i) => (
              <li key={i}>
                <span className="text-meta text-zinc-700">{slotLabel(c.slot)}: </span>
                {c.text}
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title="Invoice">
        <InvoiceSummary invoice={invoice} error={invoiceError} />
      </Section>
    </CaptureShell>
  );
}
