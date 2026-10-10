import priceTable from "../../data/price-table.json";
import { HttpError } from "@/lib/http";
import type {
  DamageReport,
  DamageType,
  FindingStatus,
  Invoice,
  InvoiceLine,
  Rental,
  ReviewedFinding,
  Severity,
} from "@/lib/types";

export const PRICES = priceTable;

const BILLABLE: readonly FindingStatus[] = ["auto_flagged", "confirmed"];
const PRICE_BY_KEY: Record<string, number> = PRICES.prices;

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replaceAll("_", " ");
const lineDescription = (f: ReviewedFinding) =>
  `${sentence(f.type)} (${f.severity}), ${f.slot.replaceAll("_", " ")}: ${f.location}`;

// RP-11: one line per auto_flagged or confirmed finding, priced from the
// sample table. The model never sets a price. Computed on every request, so
// staff reviews show up immediately.
export function buildInvoice(rental: Rental, report: DamageReport): Invoice {
  const lines: InvoiceLine[] = report.findings
    .filter((f) => BILLABLE.includes(f.status))
    .map((f) => {
      const priceKey: `${DamageType}/${Severity}` = `${f.type}/${f.severity}`;
      const amount = PRICE_BY_KEY[priceKey];
      if (amount === undefined) throw new Error(`no price for ${priceKey} in price-table.json`);
      const beforePhotoId = rental.photos.checkout[f.slot];
      const afterPhotoId = rental.photos.return[f.slot];
      if (!beforePhotoId || !afterPhotoId) {
        throw new HttpError(409, `finding ${f.id} has no ${f.slot} photo pair to show as proof`);
      }
      return { findingId: f.id, description: lineDescription(f), priceKey, amount, beforePhotoId, afterPhotoId };
    });
  const total = Math.round(lines.reduce((sum, l) => sum + l.amount, 0) * 100) / 100;
  return { reportId: report.id, rentalId: rental.id, currency: PRICES.currency, lines, total };
}
