import { formatMoney } from "@/lib/report/view";
import type { Invoice } from "@/lib/types";

interface InvoiceSummaryProps {
  invoice: Invoice | null;
  error?: string | null;
}

// Recomputed by the server after every decision; this only displays it.
export function InvoiceSummary({ invoice, error = null }: InvoiceSummaryProps) {
  if (!invoice) {
    return <p className="text-body text-zinc-700">The invoice isn&apos;t available right now. Reload to try again.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {invoice.lines.length === 0 ? (
        <p className="text-body text-zinc-700">Nothing to charge</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200">
          {invoice.lines.map((line) => (
            <li key={line.findingId} className="flex justify-between gap-3 py-2 text-body">
              <span>{line.description}</span>
              <span className="shrink-0 font-mono">{formatMoney(line.amount, invoice.currency)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="flex justify-between border-t-2 border-zinc-900 pt-2 text-body font-semibold">
        <span>Total</span>
        <span data-testid="invoice-total" className="font-mono">
          {formatMoney(invoice.total, invoice.currency)}
        </span>
      </p>
      {error && <p className="text-meta text-problem-ink">{error}</p>}
      <p className="text-meta text-zinc-700">Sample prices for the demo.</p>
    </div>
  );
}
